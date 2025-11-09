import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    name: '',
    type: 'shelter',
    description: '',
    location: { latitude: 0, longitude: 0, address: '' },
    capacity: '',
    contact: { phone: '', email: '' }
  });
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all'
  });
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchData();
    
    // Socket setup for real-time updates
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('AdminDashboard: Socket connected');
    });

    socketRef.current.on('new-incident', (incident) => {
      console.log('AdminDashboard: New incident via socket', incident);
      fetchData(); // Refresh all data
      toast.info('New incident reported!');
    });

    socketRef.current.on('incident-verified', () => {
      console.log('AdminDashboard: Incident verified via socket');
      fetchData(); // Refresh all data
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      console.log('AdminDashboard: Fetching all data...');
      const [requestsRes, incidentsRes, resourcesRes, alertsRes] = await Promise.all([
        api.get('/api/requests'),
        api.get('/api/incidents'), // Fetch new incidents
        api.get('/api/resources'),
        api.get('/api/alerts/all')
      ]);
      setRequests(requestsRes.data || []);
      setIncidents(incidentsRes.data || []);
      setResources(resourcesRes.data || []);
      setAlerts(alertsRes.data || []);
      console.log('AdminDashboard: Data loaded', {
        requests: requestsRes.data?.length || 0,
        incidents: incidentsRes.data?.length || 0,
        resources: resourcesRes.data?.length || 0,
        alerts: alertsRes.data?.length || 0
      });
    } catch (error) {
      console.error('AdminDashboard: Error fetching data', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRequest = async (requestId, verify) => {
    try {
      await api.put(`/api/requests/${requestId}`, { isVerified: verify });
      toast.success(`Request ${verify ? 'verified' : 'unverified'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const handleUpdatePriority = async (requestId, priority) => {
    try {
      await api.put(`/api/requests/${requestId}`, { priority });
      toast.success('Priority updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await api.put(`/api/requests/${requestId}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleGetLocation = () => {
    console.log('AdminDashboard: Get Location button clicked');
    
    if (!navigator.geolocation) {
      console.error('Geolocation API not available');
      toast.error('Geolocation is not supported by your browser. Please enter coordinates manually.');
      return;
    }

    setGettingLocation(true);
    console.log('AdminDashboard: Requesting geolocation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('AdminDashboard: Geolocation success', position);
        // Ensure coordinates are numbers
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        
        console.log('AdminDashboard: Setting location', { lat, lng });
        
        if (isNaN(lat) || isNaN(lng)) {
          console.error('AdminDashboard: Invalid coordinates', { lat, lng });
          toast.error('Invalid location coordinates received. Please try again.');
          setGettingLocation(false);
          return;
        }

        if (lat === 0 && lng === 0) {
          console.error('AdminDashboard: Coordinates are 0,0');
          toast.error('Invalid location (0,0). Please try again.');
          setGettingLocation(false);
          return;
        }
        
        setResourceForm((prev) => ({
          ...prev,
          location: {
            latitude: lat,
            longitude: lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          }
        }));
        
        console.log('AdminDashboard: Location set successfully', { lat, lng });
        toast.success(`Location captured! (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setGettingLocation(false);
      },
      (error) => {
        console.error('AdminDashboard: Geolocation error:', error);
        setGettingLocation(false);
        
        let errorMessage = 'Failed to get location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS or network connection.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location. Please try again or enter coordinates manually.';
            break;
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 0
      }
    );
  };

  const handleSubmitResource = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...resourceForm,
        capacity: resourceForm.capacity ? parseInt(resourceForm.capacity) : null
      };
      await api.post('/api/resources', submitData);
      toast.success('Resource added successfully!');
      setShowResourceForm(false);
      setResourceForm({
        name: '',
        type: 'shelter',
        description: '',
        location: { latitude: 0, longitude: 0, address: '' },
        capacity: '',
        contact: { phone: '', email: '' }
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add resource');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        await api.delete(`/api/resources/${resourceId}`);
        toast.success('Resource deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete resource');
      }
    }
  };

  const handleSubmitAlert = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/alerts', alertForm);
      toast.success('Alert created successfully!');
      setShowAlertForm(false);
      setAlertForm({
        title: '',
        message: '',
        type: 'info',
        targetAudience: 'all'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await api.delete(`/api/alerts/${alertId}`);
        toast.success('Alert deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete alert');
      }
    }
  };

  const handleToggleAlert = async (alertId, isActive) => {
    try {
      await api.put(`/api/alerts/${alertId}`, { isActive: !isActive });
      toast.success(`Alert ${!isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard-page">
      <div className="container">
        <h1>Admin Dashboard</h1>

        {/* Admin Quick Access Tiles - MUST BE VISIBLE */}
        <div className="admin-quick-access" style={{ display: 'grid', visibility: 'visible', opacity: 1 }}>
          <Link to="/volunteer/tasks" className="admin-quick-btn" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <div className="quick-btn-icon">📋</div>
            <div className="quick-btn-content">
              <h3>My Tasks</h3>
              <p>View your assigned tasks</p>
            </div>
          </Link>
          <Link to="/admin/incidents" className="admin-quick-btn" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <div className="quick-btn-icon">🚨</div>
            <div className="quick-btn-content">
              <h3>Incidents</h3>
              <p>Manage reported incidents</p>
            </div>
          </Link>
          <Link to="/admin/tasks" className="admin-quick-btn" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <div className="quick-btn-icon">✅</div>
            <div className="quick-btn-content">
              <h3>Tasks</h3>
              <p>Assign tasks to volunteers</p>
            </div>
          </Link>
          <Link to="/admin/volunteers" className="admin-quick-btn" style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
            <div className="quick-btn-icon">👷</div>
            <div className="quick-btn-content">
              <h3>Volunteers</h3>
              <p>Manage volunteer profiles</p>
            </div>
          </Link>
        </div>

        <div className="admin-section">
          <div className="section-header">
            <h2>Incidents & Requests</h2>
            <button onClick={fetchData} className="btn btn-secondary" style={{ fontSize: '14px', padding: '8px 16px' }}>
              🔄 Refresh
            </button>
          </div>
          
          {/* New Incidents Section */}
          {incidents.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '15px', color: '#28a745' }}>🚨 New Incidents ({incidents.length})</h3>
            <div className="requests-grid">
              {incidents.map((incident) => {
                const statusText = ['Pending', 'Verified', 'Ongoing', 'Completed'][incident.status] || 'Unknown';
                const statusColors = { 0: '#ffc107', 1: '#28a745', 2: '#17a2b8', 3: '#6c757d' };
                return (
                  <div key={`incident-${incident._id}`} className="card admin-card" style={{ borderLeft: `4px solid ${statusColors[incident.status] || '#6c757d'}` }}>
                    <div className="card-header">
                      <h3>{incident.type}</h3>
                      <div>
                        <span className="badge" style={{ backgroundColor: statusColors[incident.status] || '#6c757d', color: 'white' }}>
                          {statusText}
                        </span>
                        <span className="badge badge-info">Severity: {incident.severity}/5</span>
                      </div>
                    </div>
                    <p>{incident.description}</p>
                    <div className="card-info">
                      <p><strong>From:</strong> {incident.reportedBy?.name || 'Unknown'}</p>
                      <p><strong>Location:</strong> {typeof incident.location === 'string' ? incident.location : incident.location?.address || 'Unknown'}</p>
                      <p><strong>Reported:</strong> {new Date(incident.createdAt).toLocaleString()}</p>
                      {incident.verifiedBy && (
                        <p><strong>Verified by:</strong> {incident.verifiedBy?.name || 'Unknown'}</p>
                      )}
                    </div>
                    <div className="card-actions">
                      {incident.status === 0 && (
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/api/incidents/verify/${incident._id}`);
                              toast.success('Incident verified!');
                              fetchData();
                            } catch (error) {
                              toast.error('Failed to verify incident');
                            }
                          }}
                          className="btn btn-success"
                        >
                          ✓ Verify Incident
                        </button>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        📍 View on Map
                      </a>
                      <a
                        href="/admin/incidents"
                        className="btn btn-primary"
                      >
                        Manage Incidents
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}

          {/* Old Help Requests Section */}
          {requests.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '15px', color: '#6c757d' }}>📋 Old Help Requests ({requests.length})</h3>
            <div className="requests-grid">
              {requests.map((request) => (
            <div key={request._id} className="card admin-card">
              <div className="card-header">
                <h3>{request.title}</h3>
                <div>
                  <span className={`badge badge-${request.priority}`}>{request.priority}</span>
                  <span className={`badge badge-${request.status}`}>{request.status}</span>
                  {request.isVerified && <span className="badge badge-success">Verified</span>}
                </div>
              </div>
              <p>{request.description}</p>
              <div className="card-info">
                <p><strong>From:</strong> {request.civilian?.name}</p>
                <p><strong>Category:</strong> {request.category}</p>
                <p><strong>Location:</strong> {request.location.address || `${request.location.latitude.toFixed(4)}, ${request.location.longitude.toFixed(4)}`}</p>
              </div>
              <div className="card-actions">
                <div className="action-group">
                  <label>Priority:</label>
                  <select
                    value={request.priority}
                    onChange={(e) => handleUpdatePriority(request._id, e.target.value)}
                    className="form-control"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="action-group">
                  <label>Status:</label>
                  <select
                    value={request.status}
                    onChange={(e) => handleUpdateStatus(request._id, e.target.value)}
                    className="form-control"
                  >
                    <option value="pending">Pending</option>
                    <option value="claimed">Claimed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button
                  onClick={() => handleVerifyRequest(request._id, !request.isVerified)}
                  className={`btn ${request.isVerified ? 'btn-secondary' : 'btn-success'}`}
                >
                  {request.isVerified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            </div>
            ))}
            </div>
            </div>
          )}

          {/* Show message if no incidents or requests */}
          {incidents.length === 0 && requests.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p>No incidents or requests found.</p>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>
                Civilians can report incidents from their dashboard. New incidents will appear here automatically.
              </p>
          </div>
          )}
        </div>

      <div className="admin-section">
        <div className="section-header">
          <h2>Resources</h2>
          <button
            onClick={() => setShowResourceForm(!showResourceForm)}
            className="btn btn-primary"
          >
            {showResourceForm ? 'Cancel' : 'Add Resource'}
          </button>
        </div>

        {showResourceForm && (
          <div className="card">
            <h3>Add New Resource</h3>
            <form onSubmit={handleSubmitResource}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                >
                  <option value="shelter">Shelter</option>
                  <option value="food">Food</option>
                  <option value="medical">Medical</option>
                  <option value="water">Water</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="btn btn-secondary"
                  style={{ marginBottom: '10px' }}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? '🔄 Getting Location...' : '📍 Get Location'}
                </button>
                <input
                  type="text"
                  placeholder="Address"
                  value={resourceForm.location.address}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      location: { ...resourceForm.location, address: e.target.value }
                    })
                  }
                />
                {resourceForm.location.latitude !== 0 && (
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    Lat: {resourceForm.location.latitude.toFixed(6)}, Lng: {resourceForm.location.longitude.toFixed(6)}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Capacity (Optional)</label>
                <input
                  type="number"
                  value={resourceForm.capacity}
                  onChange={(e) => setResourceForm({ ...resourceForm, capacity: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={resourceForm.contact.phone}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      contact: { ...resourceForm.contact, phone: e.target.value }
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={resourceForm.contact.email}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      contact: { ...resourceForm.contact, email: e.target.value }
                    })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Add Resource
              </button>
            </form>
          </div>
        )}

        <div className="resources-grid">
          {resources.map((resource) => (
            <div key={resource._id} className="card admin-card">
              <div className="card-header">
                <h3>{resource.name}</h3>
                <span className="badge badge-info">{resource.type}</span>
              </div>
              {resource.description && <p>{resource.description}</p>}
              <div className="card-info">
                <p><strong>Location:</strong> {resource.location.address || `${resource.location.latitude.toFixed(4)}, ${resource.location.longitude.toFixed(4)}`}</p>
                {resource.capacity && (
                  <p><strong>Capacity:</strong> {resource.currentOccupancy}/{resource.capacity}</p>
                )}
                {resource.contact.phone && <p><strong>Phone:</strong> {resource.contact.phone}</p>}
                {resource.contact.email && <p><strong>Email:</strong> {resource.contact.email}</p>}
              </div>
              <button
                onClick={() => handleDeleteResource(resource._id)}
                className="btn btn-danger"
              >
                Delete Resource
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <div className="section-header">
          <h2>Alerts & Broadcasts</h2>
          <button
            onClick={() => setShowAlertForm(!showAlertForm)}
            className="btn btn-primary"
          >
            {showAlertForm ? 'Cancel' : 'Create Alert'}
          </button>
        </div>

        {showAlertForm && (
          <div className="card">
            <h3>Create New Alert</h3>
            <form onSubmit={handleSubmitAlert}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={alertForm.title}
                  onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                  placeholder="Alert title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={alertForm.message}
                  onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  placeholder="Alert message"
                  required
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={alertForm.type}
                  onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                  <option value="success">Success</option>
                </select>
              </div>
              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={alertForm.targetAudience}
                  onChange={(e) => setAlertForm({ ...alertForm, targetAudience: e.target.value })}
                >
                  <option value="all">All Users</option>
                  <option value="volunteers">Volunteers Only</option>
                  <option value="civilians">Civilians Only</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                Broadcast Alert
              </button>
            </form>
          </div>
        )}

        <div className="resources-grid">
          {alerts.map((alert) => (
            <div key={alert._id} className="card admin-card">
              <div className="card-header">
                <h3>{alert.title}</h3>
                <div>
                  <span className={`badge badge-${alert.type}`}>{alert.type}</span>
                  <span className={`badge ${alert.isActive ? 'badge-success' : 'badge-pending'}`}>
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p>{alert.message}</p>
              <div className="card-info">
                <p><strong>Target:</strong> {alert.targetAudience}</p>
                <p><strong>Created:</strong> {new Date(alert.createdAt).toLocaleString()}</p>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => handleToggleAlert(alert._id, alert.isActive)}
                  className={`btn ${alert.isActive ? 'btn-secondary' : 'btn-success'}`}
                >
                  {alert.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeleteAlert(alert._id)}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

