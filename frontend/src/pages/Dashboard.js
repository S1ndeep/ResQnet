import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SearchFilter from '../components/SearchFilter';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    type: '',
    severity: 3,
    description: '',
    latitude: 0,
    longitude: 0
  });

  // Socket ref
  const socketRef = useRef(null);
  
  // User's current location for map
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default: New Delhi, India
  const [mapZoom, setMapZoom] = useState(10);

  // Check if running on HTTPS or localhost
  useEffect(() => {
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecureContext && navigator.geolocation) {
      console.warn('Dashboard: Geolocation may require HTTPS. Current protocol:', window.location.protocol);
    }
  }, []);

  // Fetch incidents reported by this user
  const { 
    data: incidents = [], 
    isLoading: incidentsLoading,
    error: incidentsError,
    refetch: refetchIncidents
  } = useQuery({
    queryKey: ['userIncidents', user?._id || user?.id],
    queryFn: async () => {
      const userId = user?._id || user?.id;
      console.log('Dashboard: Fetching incidents for user:', userId, user?.role);
      const response = await api.get('/api/incidents/my-reports');
      console.log('Dashboard: Received incidents:', response.data?.length || 0, response.data);
      // Ensure we return ALL incidents without any filtering
      const allIncidents = response.data || [];
      console.log('Dashboard: Returning ALL incidents:', allIncidents.length);
      return allIncidents;
    },
    enabled: !!(user?._id || user?.id) && user?.role === 'civilian',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch old HelpRequests reported by this user
  const { 
    data: helpRequests = [], 
    isLoading: helpRequestsLoading,
    error: helpRequestsError,
    refetch: refetchHelpRequests
  } = useQuery({
    queryKey: ['userHelpRequests', user?._id || user?.id],
    queryFn: async () => {
      const userId = user?._id || user?.id;
      console.log('Dashboard: Fetching help requests for user:', userId, user?.role);
      const response = await api.get('/api/requests');
      console.log('Dashboard: Received help requests:', response.data?.length || 0, response.data);
      // Ensure we return ALL help requests without any filtering
      const allRequests = response.data || [];
      console.log('Dashboard: Returning ALL help requests:', allRequests.length);
      return allRequests;
    },
    enabled: !!(user?._id || user?.id) && user?.role === 'civilian',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Combine incidents and help requests into unified array
  const allItems = useMemo(() => {
    const items = [];
    
    // Add incidents
    incidents.forEach(incident => {
      // Ensure location is a string
      let locationString = incident.location || 'Unknown';
      if (typeof locationString !== 'string') {
        if (locationString.address) {
          locationString = locationString.address;
        } else if (locationString.latitude && locationString.longitude) {
          locationString = `${locationString.latitude}, ${locationString.longitude}`;
        } else {
          locationString = String(locationString);
        }
      }
      
      items.push({
        _itemId: incident._id,
        _itemType: 'incident',
        displayType: incident.type,
        displayDescription: incident.description || '',
        displayLocation: locationString,
        displayCreatedAt: incident.createdAt,
        severity: incident.severity,
        status: incident.status,
        displayStatus: incident.status, // 0=Pending, 1=Verified, 2=Ongoing, 3=Completed
        ...incident
      });
    });
    
    // Add help requests (old system)
    helpRequests.forEach(request => {
      // Map help request status to incident status format
      let displayStatus = 0; // Default to pending
      if (request.status === 'claimed') displayStatus = 2; // Ongoing
      else if (request.status === 'completed') displayStatus = 3; // Completed
      else if (request.status === 'verified') displayStatus = 1; // Verified
      else displayStatus = 0; // Pending
      
      // Extract location string safely
      let locationString = 'Unknown';
      if (request.location) {
        if (typeof request.location === 'string') {
          locationString = request.location;
        } else if (request.location.address) {
          locationString = request.location.address;
        } else if (request.location.latitude && request.location.longitude) {
          locationString = `${request.location.latitude}, ${request.location.longitude}`;
        } else {
          locationString = JSON.stringify(request.location);
        }
      }
      
      items.push({
        _itemId: request._id,
        _itemType: 'helpRequest',
        displayType: request.title || request.category || 'Help Request',
        displayDescription: request.description || '',
        displayLocation: locationString,
        displayCreatedAt: request.createdAt,
        priority: request.priority,
        status: request.status,
        displayStatus: displayStatus,
        claimedBy: request.claimedBy,
        ...request
      });
    });
    
    // Sort by creation date (newest first)
    items.sort((a, b) => new Date(b.displayCreatedAt) - new Date(a.displayCreatedAt));
    
    console.log('Dashboard: Combined items:', items.length, 'Incidents:', incidents.length, 'Help Requests:', helpRequests.length);
    return items;
  }, [incidents, helpRequests]);

  const requestsLoading = incidentsLoading || helpRequestsLoading;
  const requestsError = incidentsError || helpRequestsError;
  
  const refetchRequests = async () => {
    await Promise.all([refetchIncidents(), refetchHelpRequests()]);
  };

  // Fetch all incidents for map display
  const { data: mapIncidents = [], refetch: refetchMapIncidents } = useQuery({
    queryKey: ['mapIncidents'],
    queryFn: async () => {
      const response = await api.get('/api/incidents/map-data');
      return response.data || [];
    },
    enabled: user?.role === 'civilian',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch all help requests for map display
  const { data: mapRequests = [], refetch: refetchMapRequests } = useQuery({
    queryKey: ['mapRequests'],
    queryFn: async () => {
      const response = await api.get('/api/requests/map-data');
      return response.data || [];
    },
    enabled: user?.role === 'civilian',
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Get user's current location on mount
  useEffect(() => {
    if (user?.role !== 'civilian') return;
    
    if (!navigator.geolocation) {
      console.warn('Dashboard: Geolocation not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          setUserLocation([lat, lng]);
          setMapCenter([lat, lng]);
          setMapZoom(13);
          console.log('Dashboard: User location set for map:', { lat, lng });
        }
      },
      (error) => {
        console.warn('Dashboard: Could not get user location for map:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [user?.role]);

  // Combine all map markers
  const mapMarkers = useMemo(() => {
    const markers = [];
    
    // Add incidents
    mapIncidents.forEach(incident => {
      if (incident.latitude && incident.longitude) {
        markers.push({
          id: `incident-${incident._id}`,
          type: 'incident',
          position: [incident.latitude, incident.longitude],
          data: incident,
          severity: incident.severity
        });
      }
    });
    
    // Add help requests
    mapRequests.forEach(request => {
      if (request.latitude && request.longitude) {
        markers.push({
          id: `request-${request._id}`,
          type: 'helpRequest',
          position: [request.latitude, request.longitude],
          data: request,
          priority: request.priority
        });
      }
    });
    
    return markers;
  }, [mapIncidents, mapRequests]);

  const getSeverityColor = (severity) => {
    if (severity >= 5) return '#dc3545'; // Red - Very High
    if (severity >= 4) return '#fd7e14'; // Orange - High
    if (severity >= 3) return '#ffc107'; // Yellow - Medium
    return '#28a745'; // Green - Low
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Apply filters (but ensure all items are shown by default)
  const filteredItems = useMemo(() => {
    let filtered = [...allItems];
    
    console.log('Dashboard: Filtering items. Total:', allItems.length, 'Filters:', filters);

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        item => (item.displayType || '').toLowerCase().includes(searchLower) ||
               (item.displayDescription || '').toLowerCase().includes(searchLower) ||
               (item.displayLocation || '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(item => item.displayType === filters.category);
    }

    if (filters.priority) {
      // Map priority filter to severity
      const severityMap = { low: [1, 2], medium: [3], high: [4], critical: [5] };
      if (severityMap[filters.priority]) {
        filtered = filtered.filter(item => severityMap[filters.priority].includes(item.severity || 3));
      }
    }

    if (filters.status !== undefined && filters.status !== '') {
      // Map status filter: 0=Pending, 1=Verified, 2=Ongoing/Claimed, 3=Completed
      filtered = filtered.filter(item => item.displayStatus === parseInt(filters.status));
    }

    console.log('Dashboard: Filtered items:', filtered.length);
    return filtered;
  }, [allItems, filters]);

  // Create incident mutation (using new admin-mediated flow)
  const createIncidentMutation = useMutation({
    mutationFn: async (submitData) => {
      return api.post('/api/incidents/report', submitData);
    },
    onSuccess: (response) => {
      console.log('Dashboard: Incident reported successfully', response.data);
      toast.success('Incident reported successfully! Admin will review and verify.');
      setShowForm(false);
      setFormData({
        location: '',
        type: '',
        severity: 3,
        description: '',
        latitude: 0,
        longitude: 0
      });
      // Invalidate and immediately refetch to show the new incident
      queryClient.invalidateQueries(['userIncidents', user?._id || user?.id]);
      refetchIncidents(); // Force immediate refetch
    },
    onError: (error) => {
      console.error('Dashboard: Error reporting incident', error);
      toast.error(error.response?.data?.message || 'Failed to report incident');
    },
  });

  // Socket setup
  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) return;

    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('Dashboard: Socket connected');
    });

    socketRef.current.on('new-incident', (incident) => {
      console.log('Dashboard: New incident via socket', incident);
      queryClient.invalidateQueries(['userIncidents', userId]);
      queryClient.invalidateQueries(['mapIncidents']); // Refresh map
    });

    socketRef.current.on('incident-verified', () => {
      queryClient.invalidateQueries(['userIncidents', userId]);
      queryClient.invalidateQueries(['mapIncidents']); // Refresh map
    });

    socketRef.current.on('new-request', () => {
      console.log('Dashboard: New help request via socket');
      queryClient.invalidateQueries(['userHelpRequests', userId]);
      queryClient.invalidateQueries(['mapRequests']); // Refresh map
    });

    socketRef.current.on('request-updated', () => {
      queryClient.invalidateQueries(['userHelpRequests', userId]);
      queryClient.invalidateQueries(['mapRequests']); // Refresh map
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?._id, user?.id, queryClient]);

  // Get location handler
  const handleGetLocation = () => {
    console.log('Dashboard: Get Location button clicked');
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please use manual entry.');
      return;
    }

    setGettingLocation(true);
    console.log('Dashboard: Requesting geolocation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Dashboard: Geolocation success:', position);
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        
        console.log('Dashboard: Parsed coordinates:', { lat, lng });
        
        if (isNaN(lat) || isNaN(lng)) {
          console.error('Dashboard: Invalid coordinates - NaN');
          toast.error('Invalid location received. Please try again or use manual entry.');
          setGettingLocation(false);
          return;
        }
        
        if (lat === 0 && lng === 0) {
          console.error('Dashboard: Invalid coordinates - 0,0');
          toast.error('Invalid location (0,0). Please try again or use manual entry.');
          setGettingLocation(false);
          return;
        }
        
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        
        console.log('Dashboard: Location set successfully:', { lat, lng });
        toast.success(`Location captured! (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Dashboard: Geolocation error:', error);
        setGettingLocation(false);
        let errorMessage = 'Failed to get location. ';
        let detailedMessage = '';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. ';
            detailedMessage = 'Please enable location permissions in your browser settings, or use manual entry below.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. ';
            detailedMessage = 'Your device cannot determine your location. Please use manual entry.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. ';
            detailedMessage = 'Please try again or use manual entry below.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location. ';
            detailedMessage = 'Please use manual entry below.';
        }
        toast.error(errorMessage + detailedMessage, { autoClose: 5000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Increased timeout to 20 seconds
        maximumAge: 60000 // Accept cached location up to 1 minute old
      }
    );
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || user.role !== 'civilian') {
      toast.error('Only civilians can submit help requests');
      return;
    }

    if (!formData.location || !formData.type || !formData.description) {
      toast.error('Please fill in location, type, and description');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please capture your location using "Get My Location" button or enter coordinates manually');
      return;
    }

    // Validate coordinates are valid numbers
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates. Please enter valid latitude and longitude values.');
      return;
    }

    if (lat === 0 && lng === 0) {
      toast.error('Please capture your location using "Get My Location" button or enter coordinates manually');
      return;
    }
    
    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      toast.error('Invalid latitude. Must be between -90 and 90.');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      toast.error('Invalid longitude. Must be between -180 and 180.');
      return;
    }

    const submitData = {
      location: formData.location || '',
      type: formData.type || '',
      severity: formData.severity || 3,
      description: formData.description || '',
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude)
    };

    createIncidentMutation.mutate(submitData);
  };

  const loading = requestsLoading;

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <h1>Dashboard</h1>
        <p>Welcome, {user?.name}!</p>

        {user?.role === 'civilian' && (
          <div className="dashboard-actions">
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary"
            >
              {showForm ? 'Cancel' : 'Report Incident'}
            </button>
            <button
              onClick={async () => {
                console.log('Dashboard: Refresh button clicked');
                try {
                  // Invalidate query cache and refetch both incidents and help requests
                  queryClient.invalidateQueries(['userIncidents', user?._id || user?.id]);
                  queryClient.invalidateQueries(['userHelpRequests', user?._id || user?.id]);
                  await refetchRequests();
                  toast.success('All items refreshed!');
                } catch (error) {
                  console.error('Dashboard: Error refreshing:', error);
                  toast.error('Failed to refresh incidents');
                }
              }}
              className="btn btn-secondary"
              disabled={loading || requestsLoading}
            >
              {loading || requestsLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        )}

        {/* Dashboard Grid - Form and Map */}
        {user?.role === 'civilian' && (
          <div className="dashboard-grid">
            {/* Create Emergency Alert Card */}
            {showForm ? (
              <div className="card">
                <h2>🚨 Create Emergency Alert</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Incident Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      <option value="">Select incident type</option>
                      <option value="Fire">Fire</option>
                      <option value="Flood">Flood</option>
                      <option value="Earthquake">Earthquake</option>
                      <option value="Medical Emergency">Medical Emergency</option>
                      <option value="Structural Collapse">Structural Collapse</option>
                      <option value="Power Outage">Power Outage</option>
                      <option value="Water Supply Issue">Water Supply Issue</option>
                      <option value="Transportation Disruption">Transportation Disruption</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location (Address) *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Enter location address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Severity *</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                      required
                    >
                      <option value={1}>1 - Very Low</option>
                      <option value={2}>2 - Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                      <option value={5}>5 - Very High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the incident in detail..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Location Coordinates *</label>
                    <div style={{ marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="btn btn-secondary"
                        disabled={gettingLocation}
                        style={{ marginRight: '10px' }}
                      >
                        {gettingLocation ? '🔄 Getting Location...' : '📍 Get My Location'}
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Or enter coordinates manually below
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Latitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 28.6139"
                          value={formData.latitude !== 0 ? formData.latitude : ''}
                          onChange={(e) => {
                            const lat = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, latitude: lat });
                          }}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 77.2090"
                          value={formData.longitude !== 0 ? formData.longitude : ''}
                          onChange={(e) => {
                            const lng = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, longitude: lng });
                          }}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </div>
                    </div>
                    {formData.latitude !== 0 && formData.longitude !== 0 && (
                      <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>
                        ✓ Location captured: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                    {formData.latitude === 0 && formData.longitude === 0 && (
                      <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '5px' }}>
                        ⚠ Please capture your location or enter coordinates manually
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createIncidentMutation.isPending || gettingLocation}
                  >
                    {createIncidentMutation.isPending ? 'Submitting...' : 'Submit Incident Report'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="card">
                <h2>🚨 Create Emergency Alert</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                  Click the "Report Incident" button above to create a new emergency alert.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  Report Incident
                </button>
              </div>
            )}

            {/* Live Crisis Map Card */}
            <div className="card">
              <h2>🗺️ Live Crisis Map</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
                View all reported incidents and requests on the map. Your location is marked with a blue marker.
              </p>
              <div className="dashboard-map-container">
                <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}
                key={`${mapCenter[0]}-${mapCenter[1]}`}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* User's current location marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={new Icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="15" fill="#007bff" stroke="white" stroke-width="3"/>
                          <circle cx="20" cy="20" r="8" fill="white"/>
                        </svg>`
                      )}`,
                      iconSize: [40, 40],
                      iconAnchor: [20, 40]
                    })}
                  >
                    <Popup>
                      <div>
                        <h4>📍 Your Location</h4>
                        <p>You are here</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>
                          {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Incident markers */}
                {mapMarkers.filter(m => m.type === 'incident').map(marker => (
                  <Marker
                    key={marker.id}
                    position={marker.position}
                    icon={new Icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                          <circle cx="15" cy="15" r="12" fill="${getSeverityColor(marker.severity)}" stroke="white" stroke-width="2"/>
                          <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
                        </svg>`
                      )}`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <div>
                        <h4>{marker.data.type}</h4>
                        <p>{marker.data.description || 'No description'}</p>
                        <p><strong>Severity:</strong> {marker.data.severity}/5</p>
                        <p><strong>Status:</strong> {['Pending', 'Verified', 'Ongoing', 'Completed'][marker.data.status] || 'Unknown'}</p>
                        <p><strong>Location:</strong> {typeof marker.data.location === 'string' ? marker.data.location : marker.data.location?.address || 'Unknown'}</p>
                        {marker.data.reportedBy && (
                          <p><strong>Reported by:</strong> {marker.data.reportedBy?.name || 'Unknown'}</p>
                        )}
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                          {new Date(marker.data.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Help request markers */}
                {mapMarkers.filter(m => m.type === 'helpRequest').map(marker => (
                  <Marker
                    key={marker.id}
                    position={marker.position}
                    icon={new Icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                          <circle cx="14" cy="14" r="11" fill="${getPriorityColor(marker.priority)}" stroke="white" stroke-width="2"/>
                          <text x="14" y="18" text-anchor="middle" fill="white" font-size="12" font-weight="bold">?</text>
                        </svg>`
                      )}`,
                      iconSize: [28, 28],
                      iconAnchor: [14, 28]
                    })}
                  >
                    <Popup>
                      <div>
                        <h4>{marker.data.title || marker.data.category || 'Help Request'}</h4>
                        <p>{marker.data.description || 'No description'}</p>
                        <p><strong>Priority:</strong> {marker.data.priority || 'Medium'}</p>
                        <p><strong>Status:</strong> {marker.data.status || 'Unknown'}</p>
                        <p><strong>Category:</strong> {marker.data.category || 'Unknown'}</p>
                        {marker.data.civilian && (
                          <p><strong>Reported by:</strong> {marker.data.civilian?.name || 'Unknown'}</p>
                        )}
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                          {new Date(marker.data.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="dashboard-map-controls">
              <button
                onClick={() => {
                  refetchMapIncidents();
                  refetchMapRequests();
                  toast.info('Map refreshed!');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                🔄 Refresh Map
              </button>
              {userLocation && (
                <button
                  onClick={() => {
                    setMapCenter(userLocation);
                    setMapZoom(13);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  📍 Center on My Location
                </button>
              )}
            </div>
            <div className="map-legend">
              <h4>Map Legend</h4>
              <div className="map-legend-item">
                <span style={{ color: '#007bff', fontSize: '16px' }}>●</span> Your Location
              </div>
              <div className="map-legend-item">
                <span style={{ color: '#dc3545', fontSize: '16px' }}>●</span> High Severity Incidents
              </div>
              <div className="map-legend-item">
                <span style={{ color: '#ffc107', fontSize: '16px' }}>●</span> Medium Severity Incidents
              </div>
              <div className="map-legend-item">
                <span style={{ color: '#28a745', fontSize: '16px' }}>●</span> Low Severity Incidents
              </div>
              <div className="map-legend-item">
                <span style={{ color: '#6c757d', fontSize: '16px' }}>●</span> Old Help Requests
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Requests List Section */}
        {user?.role === 'civilian' && (
          <div className="requests-list">
            <h2>Your Reported Incidents</h2>
            
            {loading ? (
            <div className="loading-container" style={{ minHeight: '200px' }}>
              <div className="loading-spinner"></div>
              <p>Loading incidents...</p>
            </div>
          ) : requestsError ? (
            <div className="error-message">
              <p>Error loading incidents: {requestsError.message}</p>
              <button 
                onClick={async () => {
                  console.log('Dashboard: Retry button clicked');
                  try {
                    queryClient.invalidateQueries(['userIncidents', user?._id || user?.id]);
                    queryClient.invalidateQueries(['userHelpRequests', user?._id || user?.id]);
                    await refetchRequests();
                    toast.success('All items refreshed!');
                  } catch (error) {
                    console.error('Dashboard: Error retrying:', error);
                    toast.error('Failed to refresh items');
                  }
                }} 
                className="btn btn-primary"
                disabled={loading || requestsLoading}
              >
                {loading || requestsLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                  {allItems.length > 0 
                    ? `Showing ${filteredItems.length} of ${allItems.length} item${allItems.length !== 1 ? 's' : ''} (${incidents.length} incident${incidents.length !== 1 ? 's' : ''}, ${helpRequests.length} old request${helpRequests.length !== 1 ? 's' : ''})`
                    : 'No incidents or requests reported yet. Report an incident above!'}
                </p>
                {allItems.length > 0 && filteredItems.length < allItems.length && (
                  <button
                    onClick={() => setFilters({})}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Clear Filters ({filteredItems.length}/{allItems.length})
                  </button>
                )}
              </div>
              
              <SearchFilter onFilterChange={(f) => setFilters(f)} />
              
              {filteredItems.length === 0 && allItems.length > 0 ? (
                <div className="no-requests">
                  <p>No items found matching your filters.</p>
                  <p style={{ marginTop: '10px', fontSize: '14px' }}>
                    You have {allItems.length} item{allItems.length !== 1 ? 's' : ''} total. Try adjusting your search filters or{' '}
                    <button 
                      onClick={() => setFilters({})}
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      clear all filters
                    </button>.
                  </p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="no-requests">
                  <p>No incidents or requests reported yet. Report an incident above!</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {filteredItems.map((item) => {
                    const statusText = item._itemType === 'incident' 
                      ? (['Pending', 'Verified', 'Ongoing', 'Completed'][item.status] || 'Unknown')
                      : (item.status === 'pending' ? 'Pending' : item.status === 'claimed' ? 'Claimed' : item.status === 'completed' ? 'Completed' : item.status);
                    const severityColors = { 1: '#28a745', 2: '#6c757d', 3: '#ffc107', 4: '#fd7e14', 5: '#dc3545' };
                    const severity = item.severity || (item.priority === 'low' ? 1 : item.priority === 'medium' ? 3 : item.priority === 'high' ? 4 : item.priority === 'critical' ? 5 : 3);
                    
                    return (
                      <div key={item._itemId} className="card request-card">
                        <div className="request-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3>{item.displayType}</h3>
                            {item._itemType === 'helpRequest' && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', background: '#6c757d', color: 'white', borderRadius: '3px' }}>
                                OLD
                              </span>
                            )}
                          </div>
                          <div>
                            <span 
                              className="badge" 
                              style={{ backgroundColor: severityColors[severity] || '#6c757d', color: 'white' }}
                            >
                              {item._itemType === 'incident' ? `Severity: ${severity}/5` : `Priority: ${item.priority || 'Medium'}`}
                            </span>
                            <span className={`badge badge-${item.displayStatus === 0 || item.status === 'pending' ? 'pending' : item.displayStatus === 1 || item.status === 'verified' ? 'verified' : 'completed'}`}>
                              {statusText}
                            </span>
                          </div>
                        </div>
                        <p>{item.displayDescription || 'No description provided'}</p>
                        <div className="request-info">
                          <p><strong>Location:</strong> {String(item.displayLocation || 'Unknown')}</p>
                          <p><strong>Reported:</strong> {new Date(item.displayCreatedAt).toLocaleString()}</p>
                          {item._itemType === 'incident' ? (
                            <>
                              {item.status === 1 && (
                                <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                                  ✓ Verified - Admin will assign volunteers
                                </p>
                              )}
                              {item.status === 0 && (
                                <p style={{ color: '#ffc107', fontWeight: 'bold' }}>
                                  ⏳ Pending Admin Verification
                                </p>
                              )}
                              {item.status === 2 && (
                                <p style={{ color: '#17a2b8', fontWeight: 'bold' }}>
                                  🔄 Ongoing - Volunteers are working on this
                                </p>
                              )}
                              {item.status === 3 && (
                                <p style={{ color: '#6c757d', fontWeight: 'bold' }}>
                                  ✓ Completed
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              {item.status === 'pending' && (
                                <p style={{ color: '#ffc107', fontWeight: 'bold' }}>
                                  ⏳ Pending - Waiting for volunteer
                                </p>
                              )}
                              {item.status === 'claimed' && (
                                <p style={{ color: '#17a2b8', fontWeight: 'bold' }}>
                                  🔄 Claimed - Volunteer is helping
                                </p>
                              )}
                              {item.status === 'completed' && (
                                <p style={{ color: '#6c757d', fontWeight: 'bold' }}>
                                  ✓ Completed
                                </p>
                              )}
                              {item.claimedBy && (
                                <p><strong>Claimed by:</strong> {item.claimedBy?.name || 'Volunteer'}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
