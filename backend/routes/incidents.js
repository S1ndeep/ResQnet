const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const Task = require('../models/Task');
const VolunteerProfile = require('../models/VolunteerProfile');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendIncidentVerificationEmail } = require('../utils/emailService');

// ============================================
// INCIDENT ROUTES (Admin-Mediated Flow)
// ============================================

// STEP 1: Civilian reports incident (status: 0 = Pending)
router.post('/report', authMiddleware, async (req, res) => {
  try {
    console.log('POST /api/incidents/report - Request received');
    console.log('User:', { id: req.user._id, role: req.user.role, name: req.user.name });
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Check if user is a civilian
    if (req.user.role !== 'civilian') {
      return res.status(403).json({ message: 'Only civilians can report incidents' });
    }

    const { location, type, severity, description, latitude, longitude } = req.body;

    // Validate required fields
    if (!location || !type || !severity || !description) {
      return res.status(400).json({ message: 'Location, type, severity, and description are required' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Validate severity (1-5)
    const severityNum = parseInt(severity);
    if (isNaN(severityNum) || severityNum < 1 || severityNum > 5) {
      return res.status(400).json({ message: 'Severity must be between 1 and 5' });
    }

    // Create incident with status: 0 (Pending)
    const incident = new Incident({
      location,
      type,
      severity: severityNum,
      description,
      latitude: lat,
      longitude: lng,
      status: 0, // ✅ PENDING STATUS
      reportedBy: req.user._id
    });

    await incident.save();
    await incident.populate('reportedBy', 'name email phone');

    console.log('New incident reported:', {
      id: incident._id,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      reportedBy: incident.reportedBy?.name
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('new-incident', incident);
      console.log('Socket event "new-incident" emitted');
    }

    res.status(201).json({
      message: 'Incident reported successfully! Admin will review and verify.',
      incident
    });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// STEP 2: Admin views pending incidents (status: 0)
router.get('/public-reports', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.find({ status: 0 }) // Only pending
      .sort({ severity: -1, createdAt: -1 })
      .populate('reportedBy', 'name email phone');

    console.log(`GET /api/incidents/public-reports - Found ${incidents.length} pending incidents`);

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching pending incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STEP 3: Admin verifies incident (status: 0 → 1) and notifies volunteers
router.put('/verify/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    if (incident.status !== 0) {
      return res.status(400).json({ message: 'Incident is not pending' });
    }

    // Update incident status to Verified (1)
    incident.status = 1; // ✅ 0 → 1 (Verified)
    incident.verifiedBy = req.user._id;
    incident.verifiedAt = new Date();

    await incident.save();
    await incident.populate('reportedBy', 'name email phone');
    await incident.populate('verifiedBy', 'name email');

    console.log('Incident verified:', {
      id: incident._id,
      type: incident.type,
      verifiedBy: incident.verifiedBy?.name
    });

    // ✅ CRITICAL: Notify all accepted volunteers via email
    try {
      const volunteers = await VolunteerProfile.find({
        applicationStatus: 1 // Only accepted volunteers
      }).populate('userId', 'email name');

      const emailList = volunteers.map((vol) => vol.userId.email).filter(Boolean);

      if (emailList.length > 0) {
        await sendIncidentVerificationEmail(emailList, incident);
        console.log(`Sent verification email to ${emailList.length} volunteers`);
      } else {
        console.log('No volunteers to notify');
      }
    } catch (emailError) {
      console.error('Email notification error (non-blocking):', emailError);
      // Don't fail the request if email fails
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('incident-verified', incident);
      console.log('Socket event "incident-verified" emitted');
    }

    res.json({
      message: 'Incident verified and volunteers notified!',
      incident
    });
  } catch (error) {
    console.error('Error verifying incident:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all verified incidents (for admin to assign tasks)
router.get('/verified', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const incidents = await Incident.find({ status: 1 }) // Only verified
      .sort({ severity: -1, createdAt: -1 })
      .populate('reportedBy', 'name email phone');

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching verified incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get incidents reported by logged-in user (Civilian can see their own incidents)
router.get('/my-reports', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/incidents/my-reports - User ID:', req.user._id, 'Role:', req.user.role);
    
    // Fetch ALL incidents for this user (no status filter)
    const incidents = await Incident.find({ reportedBy: req.user._id })
      .sort({ severity: -1, createdAt: -1 })
      .populate('reportedBy', 'name email phone')
      .populate('verifiedBy', 'name email');

    console.log(`GET /api/incidents/my-reports - Found ${incidents.length} total incidents for user`);
    console.log('Incidents status breakdown:', {
      pending: incidents.filter(i => i.status === 0).length,
      verified: incidents.filter(i => i.status === 1).length,
      ongoing: incidents.filter(i => i.status === 2).length,
      completed: incidents.filter(i => i.status === 3).length
    });

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching user incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all incidents for map display (public - civilians can see all incidents on map)
router.get('/map-data', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/incidents/map-data - Request received');
    console.log('User:', { id: req.user._id, role: req.user.role });
    
    // Fetch ALL incidents for map display (regardless of who reported them)
    const incidents = await Incident.find({})
      .select('type location latitude longitude severity status createdAt reportedBy')
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 });

    console.log(`GET /api/incidents/map-data - Found ${incidents.length} incidents for map`);

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching map incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all incidents (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('GET /api/incidents - Request received');
    console.log('User:', { id: req.user._id, role: req.user.role, name: req.user.name });
    
    const { status } = req.query;
    const query = status ? { status: parseInt(status) } : {};

    console.log('GET /api/incidents - Query:', JSON.stringify(query, null, 2));

    const incidents = await Incident.find(query)
      .sort({ severity: -1, createdAt: -1 })
      .populate('reportedBy', 'name email phone')
      .populate('verifiedBy', 'name email');

    console.log(`GET /api/incidents - Found ${incidents.length} incidents`);
    console.log('Incidents:', incidents.map(inc => ({
      id: inc._id,
      type: inc.type,
      status: inc.status,
      createdAt: inc.createdAt
    })));

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single incident
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name email phone')
      .populate('verifiedBy', 'name email');

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Civilians can only see their own incidents
    if (req.user.role === 'civilian' && incident.reportedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


