const express = require('express');
const router = express.Router();
const HelpRequest = require('../models/HelpRequest');
const { authMiddleware, adminMiddleware, volunteerMiddleware } = require('../middleware/auth');
const { sendClaimNotificationEmail } = require('../utils/emailService');

// DEBUG ENDPOINT - Get ALL requests regardless of role (for testing)
router.get('/debug/all', authMiddleware, async (req, res) => {
  try {
    const allRequests = await HelpRequest.find({})
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .sort({ createdAt: -1 });

    const requestsData = allRequests.map(req => {
      const reqObj = req.toObject ? req.toObject() : req;
      return reqObj;
    });

    console.log('DEBUG /api/requests/debug/all - Total requests in DB:', requestsData.length);
    console.log('Requests:', requestsData.map(r => ({
      id: r._id,
      title: r.title,
      status: r.status,
      civilian: r.civilian?.name,
      claimedBy: r.claimedBy?.name || r.claimedBy
    })));

    res.json(requestsData);
  } catch (error) {
    console.error('Error in DEBUG endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all requests for map display (public - civilians can see all requests on map)
router.get('/map-data', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/requests/map-data - Request received');
    console.log('User:', { id: req.user._id, role: req.user.role });
    
    // Fetch ALL requests for map display (regardless of who reported them)
    const requests = await HelpRequest.find({})
      .select('title category priority status location latitude longitude createdAt civilian')
      .populate('civilian', 'name')
      .sort({ createdAt: -1 });

    // Convert location objects to coordinates
    const mapRequests = requests.map(req => {
      const reqObj = req.toObject ? req.toObject() : req;
      let lat = null;
      let lng = null;
      
      if (reqObj.location) {
        if (reqObj.location.latitude && reqObj.location.longitude) {
          lat = reqObj.location.latitude;
          lng = reqObj.location.longitude;
        } else if (reqObj.location.coordinates && Array.isArray(reqObj.location.coordinates)) {
          // GeoJSON format: [longitude, latitude]
          lng = reqObj.location.coordinates[0];
          lat = reqObj.location.coordinates[1];
        }
      }
      
      return {
        ...reqObj,
        latitude: lat,
        longitude: lng
      };
    }).filter(req => req.latitude && req.longitude); // Only return requests with valid coordinates

    console.log(`GET /api/requests/map-data - Found ${mapRequests.length} requests with valid coordinates for map`);

    res.json(mapRequests);
  } catch (error) {
    console.error('Error fetching map requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all requests (filtered by role + search/filter)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    
    // Civilians only see their own requests
    // Volunteers and Admins see ALL requests
    if (req.user.role === 'civilian') {
      query.civilian = req.user._id;
    }
    // For volunteers and admins, query remains {} which returns all requests
    
    // Search filter
    const { search, category, priority, status, startDate, endDate } = req.query;
    
    // Add search filter - MongoDB will automatically AND this with civilian filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add other filters - MongoDB automatically ANDs all top-level fields
    if (category) {
      query.category = category;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    console.log('GET /api/requests - Query:', JSON.stringify(query, null, 2));
    console.log('GET /api/requests - User:', { role: req.user.role, id: req.user._id, idType: typeof req.user._id });
    
    const requests = await HelpRequest.find(query)
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('GET /api/requests - Found requests:', requests.length);

    // Convert to plain objects to ensure proper JSON serialization
    const requestsData = requests.map(req => {
      const reqObj = req.toObject ? req.toObject() : req;
      // Ensure claimedBy is explicitly null if not set
      if (!reqObj.claimedBy) {
        reqObj.claimedBy = null;
      }
      // Ensure status is set
      reqObj.status = reqObj.status || 'pending';
      return reqObj;
    });

    console.log('GET /api/requests - Response:', {
      userRole: req.user.role,
      userId: req.user._id,
      query: query,
      totalRequests: requestsData.length,
      requestDetails: requestsData.map(r => ({ 
        id: r._id, 
        status: r.status, 
        title: r.title,
        civilianId: r.civilian?._id || r.civilian,
        claimedBy: r.claimedBy?._id || r.claimedBy || null
      }))
    });

    res.json(requestsData);
  } catch (error) {
    console.error('Error in GET /api/requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get ALL pending requests for volunteers - SIMPLE AND DIRECT
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/requests/pending - User:', req.user.role, req.user._id);
    
    // Just get ALL requests with status pending - no filtering
    const allPendingRequests = await HelpRequest.find({ status: 'pending' })
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .sort({ createdAt: -1 });

    console.log('Found pending requests:', allPendingRequests.length);

    // Convert to plain objects
    const requestsData = allPendingRequests.map(req => {
      const reqObj = req.toObject ? req.toObject() : req;
      // Ensure claimedBy is set properly
      if (!reqObj.claimedBy) {
        reqObj.claimedBy = null;
      }
      return reqObj;
    });

    console.log('Returning requests:', requestsData.length, requestsData.map(r => ({ id: r._id, title: r.title, claimedBy: r.claimedBy })));

    res.json(requestsData);
  } catch (error) {
    console.error('Error in GET /api/requests/pending:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nearby available requests for volunteers (geospatial query) - MUST be before /available route
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    // Only volunteers and admins can access this endpoint
    if (req.user.role !== 'volunteer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Volunteers and admins only.' });
    }

    const { latitude, longitude, radius = 10 } = req.query; // radius in kilometers, default 10km

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      return res.status(400).json({ message: 'Invalid coordinates or radius' });
    }

    // Convert radius from kilometers to radians (Earth's radius ≈ 6371 km)
    const radiusInRadians = radiusKm > 0 ? radiusKm / 6371 : null;

    // MongoDB geospatial query: find requests within radius
    const baseQuery = {
      status: 'pending',
      $or: [
        { claimedBy: null },
        { claimedBy: { $exists: false } },
        { claimedBy: { $eq: null } }
      ]
    };

    // Add geospatial filter only if radius > 0
    const query = radiusKm > 0 ? {
      ...baseQuery,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians]
        }
      }
    } : baseQuery;

    console.log('GET /api/requests/nearby - Query:', {
      center: [lat, lng],
      radiusKm,
      hasGeoSpatialFilter: radiusKm > 0
    });

    const requests = await HelpRequest.find(query)
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate distance for each request and add to response
    const requestsData = requests
      .map(req => {
        const reqObj = req.toObject ? req.toObject() : req;
        // Calculate distance using Haversine formula
        if (reqObj.location && reqObj.location.coordinates) {
          const [reqLng, reqLat] = reqObj.location.coordinates;
          const distance = calculateDistance(lat, lng, reqLat, reqLng);
          reqObj.distance = Math.round(distance * 10) / 10; // Round to 1 decimal place
        }
        return reqObj;
      })
      .filter(req => {
        const claimedById = req.claimedBy?._id || req.claimedBy;
        const isActuallyUnclaimed = !claimedById || claimedById === null;
        return isActuallyUnclaimed && req.status === 'pending';
      })
      .map(req => {
        req.claimedBy = null;
        req.status = 'pending';
        return req;
      })
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity)); // Sort by distance

    console.log('GET /api/requests/nearby - Results:', {
      userRole: req.user.role,
      userId: req.user._id,
      center: [lat, lng],
      radiusKm: radiusKm > 0 ? radiusKm : 'all',
      totalNearbyRequests: requestsData.length,
      requests: requestsData.map(r => ({
        id: r._id,
        title: r.title,
        distance: r.distance
      }))
    });

    res.json(requestsData);
  } catch (error) {
    console.error('Error in GET /api/requests/nearby:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get available requests for volunteers (pending and unclaimed) - MUST be before /:id route
router.get('/available', authMiddleware, async (req, res) => {
  try {
    // Only volunteers and admins can access this endpoint
    if (req.user.role !== 'volunteer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Volunteers and admins only.' });
    }

    // More flexible query: status is 'pending' AND (claimedBy is null OR doesn't exist)
    const query = {
      status: 'pending',
      $or: [
        { claimedBy: null },
        { claimedBy: { $exists: false } },
        { claimedBy: { $eq: null } }
      ]
    };

    console.log('GET /api/requests/available - Query:', JSON.stringify(query));

    const requests = await HelpRequest.find(query)
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('GET /api/requests/available - Raw results:', {
      count: requests.length,
      requests: requests.map(r => ({
        id: r._id,
        title: r.title,
        status: r.status,
        claimedBy: r.claimedBy,
        claimedById: r.claimedBy?._id || r.claimedBy
      }))
    });

    // Convert to plain objects and filter out any that are actually claimed
    const requestsData = requests
      .map(req => {
        const reqObj = req.toObject ? req.toObject() : req;
        return reqObj;
      })
      .filter(req => {
        // Double-check: ensure claimedBy is actually null/undefined
        const claimedById = req.claimedBy?._id || req.claimedBy;
        const isActuallyUnclaimed = !claimedById || claimedById === null;
        return isActuallyUnclaimed && req.status === 'pending';
      })
      .map(req => {
        // Ensure fields are explicitly set
        req.claimedBy = null;
        req.status = 'pending';
        return req;
      });

    console.log('GET /api/requests/available - Filtered results:', {
      userRole: req.user.role,
      userId: req.user._id,
      totalAvailableRequests: requestsData.length,
      requestIds: requestsData.map(r => r._id),
      requestTitles: requestsData.map(r => r.title)
    });

    res.json(requestsData);
  } catch (error) {
    console.error('Error in GET /api/requests/available:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Get single request
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id)
      .populate('civilian', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .populate('verifiedBy', 'name email');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Civilians can only see their own requests
    if (req.user.role === 'civilian' && request.civilian._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create request (Civilians only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('POST /api/requests - Request received');
    console.log('User:', { id: req.user._id, role: req.user.role, name: req.user.name });
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Check if user is a civilian
    if (req.user.role !== 'civilian') {
      console.log('Access denied - User role is:', req.user.role);
      return res.status(403).json({ message: 'Only civilians can create help requests' });
    }

    const { title, description, location, category, priority } = req.body;

    // Validate required fields
    if (!title || !description) {
      console.log('Validation failed - Missing title or description');
      return res.status(400).json({ message: 'Title and description are required' });
    }

    if (!location) {
      console.log('Validation failed - Missing location object');
      return res.status(400).json({ message: 'Location is required' });
    }

    // Convert to numbers if they're strings (common from form submissions)
    const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
    const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;

    // Validate coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
      console.log('Validation failed - Invalid location coordinates:', { lat, lng });
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }

    if (lat === 0 && lng === 0) {
      console.log('Validation failed - Location is 0,0');
      return res.status(400).json({ message: 'Please capture your location. Coordinates cannot be 0,0' });
    }

    // Use parsed numbers for the request
    const validLocation = {
      latitude: lat,
      longitude: lng,
      address: location.address || ''
    };

    const helpRequest = new HelpRequest({
      civilian: req.user._id,
      title,
      description,
      location: validLocation,
      category: category || 'other',
      priority: priority || 'medium',
      status: 'pending', // Explicitly set status to pending
      claimedBy: null // Explicitly set claimedBy to null
    });

    // Ensure coordinates are set for geospatial queries (pre-save hook handles this, but ensure it's set)
    if (!helpRequest.location.coordinates && helpRequest.location.latitude && helpRequest.location.longitude) {
      helpRequest.location.coordinates = [helpRequest.location.longitude, helpRequest.location.latitude];
    }

    await helpRequest.save();
    await helpRequest.populate('civilian', 'name email phone');

    console.log('New help request created:', {
      id: helpRequest._id,
      title: helpRequest.title,
      status: helpRequest.status,
      civilian: helpRequest.civilian?.name,
      civilianId: helpRequest.civilian?._id || helpRequest.civilian,
      claimedBy: helpRequest.claimedBy
    });

    // NOTE: Socket event is now emitted automatically by Mongoose post-save hook
    // Keeping this as a backup/fallback mechanism
    const io = req.app.get('io');
    if (io) {
      const connectedClients = io.sockets.sockets.size;
      console.log(`[ROUTE HANDLER] Backup socket emission to ${connectedClients} connected client(s)`);
      
      // Convert to plain object for socket emission
      let requestData;
      try {
        requestData = JSON.parse(JSON.stringify(helpRequest.toObject ? helpRequest.toObject() : helpRequest));
      } catch (e) {
        requestData = helpRequest.toObject ? helpRequest.toObject() : helpRequest;
        if (requestData.civilian && typeof requestData.civilian === 'object') {
          requestData.civilian = {
            _id: requestData.civilian._id,
            name: requestData.civilian.name,
            email: requestData.civilian.email,
            phone: requestData.civilian.phone
          };
        }
      }
      
      requestData.claimedBy = null;
      requestData.status = requestData.status || 'pending';
      
      io.emit('new-request', requestData);
      console.log('[ROUTE HANDLER] Backup socket event emitted');
    }

    res.status(201).json(helpRequest);
  } catch (error) {
    console.error('Error creating help request:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Update request (Admin can update any, Civilian can update own)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check permissions
    if (req.user.role === 'civilian' && request.civilian.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, location, category, priority, status, isVerified } = req.body;

    if (title) request.title = title;
    if (description) request.description = description;
    if (location) request.location = location;
    if (category) request.category = category;
    if (priority) request.priority = priority;
    if (status) request.status = status;
    if (isVerified !== undefined && req.user.role === 'admin') {
      request.isVerified = isVerified;
      request.verifiedBy = req.user._id;
    }

    await request.save();
    await request.populate('civilian', 'name email phone');
    await request.populate('claimedBy', 'name email phone');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('request-updated', request);

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim request (Volunteers only)
router.post('/:id/claim', authMiddleware, volunteerMiddleware, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status === 'claimed' || request.status === 'resolved') {
      return res.status(400).json({ message: 'Request already claimed or resolved' });
    }

    request.claimedBy = req.user._id;
    request.status = 'claimed';

    await request.save();
    await request.populate('civilian', 'name email phone');
    await request.populate('claimedBy', 'name email phone');

    console.log('Request claimed:', {
      id: request._id,
      title: request.title,
      claimedBy: request.claimedBy?.name,
      status: request.status
    });

    // Send email notification to civilian
    try {
      await sendClaimNotificationEmail(
        request.civilian,
        request.claimedBy,
        request
      );
    } catch (emailError) {
      console.error('Email notification error (non-blocking):', emailError);
      // Don't fail the request if email fails
    }

    // Convert to plain object for socket emission
    const requestData = request.toObject ? request.toObject() : request;

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('request-claimed', requestData);
      console.log('Socket event "request-claimed" emitted to all clients');
    } else {
      console.error('Socket.io instance not available!');
    }

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete request
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only admin or the request owner can delete
    if (req.user.role !== 'admin' && request.civilian.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await request.deleteOne();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('request-deleted', { id: req.params.id });

    res.json({ message: 'Request deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

