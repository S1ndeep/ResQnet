import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import SearchFilter from '../components/SearchFilter';
import io from 'socket.io-client';
import './MapView.css';

const MapView = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const socketRef = useRef(null);

  const applyFiltersToRequests = (requestsList) => {
    let filtered = requestsList;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(searchLower) ||
          (r.description || '').toLowerCase().includes(searchLower)
      );
    }
    if (filters.category) {
      filtered = filtered.filter((r) => r.category === filters.category);
    }
    if (filters.priority) {
      filtered = filtered.filter((r) => r.priority === filters.priority);
    }
    if (filters.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    setFilteredRequests(filtered);
  };

  const applyFiltersToIncidents = (incidentsList) => {
    let filtered = incidentsList;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.type || '').toLowerCase().includes(searchLower) ||
          (i.description || '').toLowerCase().includes(searchLower) ||
          (i.location || '').toLowerCase().includes(searchLower)
      );
    }
    if (filters.category) {
      filtered = filtered.filter((i) => i.type === filters.category);
    }
    if (filters.priority) {
      // Map priority filter to severity
      const severityMap = { low: [1, 2], medium: [3], high: [4], critical: [5] };
      if (severityMap[filters.priority]) {
        filtered = filtered.filter((i) => severityMap[filters.priority].includes(i.severity || 3));
      }
    }
    if (filters.status) {
      // Map status filter: 0=Pending, 1=Verified, 2=Ongoing, 3=Completed
      const statusMap = { pending: 0, verified: 1, ongoing: 2, completed: 3 };
      if (statusMap[filters.status] !== undefined) {
        filtered = filtered.filter((i) => i.status === statusMap[filters.status]);
      }
    }

    setFilteredIncidents(filtered);
  };

  useEffect(() => {
    applyFiltersToRequests(requests);
  }, [filters, requests]);

  useEffect(() => {
    applyFiltersToIncidents(incidents);
  }, [filters, incidents]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const queryString = params.toString();
      const [requestsRes, incidentsRes, resourcesRes] = await Promise.all([
        api.get(`/api/requests${queryString ? '?' + queryString : ''}`).catch(() => ({ data: [] })),
        api.get('/api/incidents/map-data').catch(() => ({ data: [] })),
        api.get('/api/resources').catch(() => ({ data: [] }))
      ]);
      
      setRequests(requestsRes.data || []);
      setFilteredRequests(requestsRes.data || []);
      setIncidents(incidentsRes.data || []);
      setFilteredIncidents(incidentsRes.data || []);
      setResources(resourcesRes.data || []);
      
      console.log('MapView: Fetched data -', {
        requests: requestsRes.data?.length || 0,
        incidents: incidentsRes.data?.length || 0,
        resources: resourcesRes.data?.length || 0
      });
    } catch (error) {
      console.error('MapView: Error fetching data:', error);
      toast.error('Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic counts
  const totalHelpRequests = useMemo(() => filteredRequests.length, [filteredRequests]);
  const totalResources = useMemo(() => resources.length, [resources]);
  const pendingRequests = useMemo(() => 
    filteredRequests.filter((r) => r.status === 'pending').length, 
    [filteredRequests]
  );
  const pendingIncidents = useMemo(() => 
    filteredIncidents.filter((i) => i.status === 0).length, 
    [filteredIncidents]
  );
  const totalPending = pendingRequests + pendingIncidents;

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    const handleNewRequest = (request) => {
      console.log('MapView: New request via socket', request);
      setRequests((prev) => {
        const updated = [request, ...prev];
        return updated;
      });
    };

    const handleRequestUpdated = (request) => {
      console.log('MapView: Request updated via socket', request);
      setRequests((prev) => {
        const updated = prev.map((r) => (r._id === request._id ? request : r));
        return updated;
      });
    };

    const handleRequestClaimed = (request) => {
      console.log('MapView: Request claimed via socket', request);
      setRequests((prev) =>
        prev.map((r) => (r._id === request._id ? request : r))
      );
      toast.info('A request has been claimed');
    };

    const handleRequestDeleted = (data) => {
      const id = data?.id || data?._id || data;
      setRequests((prev) => {
        const updated = prev.filter((r) => r._id !== id);
        return updated;
      });
    };

    const handleNewIncident = (incident) => {
      console.log('MapView: New incident via socket', incident);
      setIncidents((prev) => {
        const updated = [incident, ...prev];
        return updated;
      });
    };

    const handleIncidentVerified = (incident) => {
      console.log('MapView: Incident verified via socket', incident);
      setIncidents((prev) => {
        const updated = prev.map((i) => (i._id === incident._id ? incident : i));
        return updated;
      });
    };

    const handleNewResource = (resource) => {
      console.log('MapView: New resource via socket', resource);
      setResources((prev) => [resource, ...prev]);
    };

    const handleResourceUpdated = (resource) => {
      setResources((prev) =>
        prev.map((r) => (r._id === resource._id ? resource : r))
      );
    };

    const handleResourceDeleted = (data) => {
      const id = data?.id || data?._id || data;
      setResources((prev) => prev.filter((r) => r._id !== id));
    };

    socketRef.current.on('connect', () => {
      console.log('MapView: Socket connected');
    });

    socketRef.current.on('new-request', handleNewRequest);
    socketRef.current.on('request-updated', handleRequestUpdated);
    socketRef.current.on('request-claimed', handleRequestClaimed);
    socketRef.current.on('request-deleted', handleRequestDeleted);
    socketRef.current.on('new-incident', handleNewIncident);
    socketRef.current.on('incident-verified', handleIncidentVerified);
    socketRef.current.on('new-resource', handleNewResource);
    socketRef.current.on('resource-updated', handleResourceUpdated);
    socketRef.current.on('resource-deleted', handleResourceDeleted);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-request', handleNewRequest);
        socketRef.current.off('request-updated', handleRequestUpdated);
        socketRef.current.off('request-claimed', handleRequestClaimed);
        socketRef.current.off('request-deleted', handleRequestDeleted);
        socketRef.current.off('new-incident', handleNewIncident);
        socketRef.current.off('incident-verified', handleIncidentVerified);
        socketRef.current.off('new-resource', handleNewResource);
        socketRef.current.off('resource-updated', handleResourceUpdated);
        socketRef.current.off('resource-deleted', handleResourceDeleted);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClaimRequest = async (requestId) => {
    try {
      await api.post(`/api/requests/${requestId}/claim`);
      toast.success('Request claimed successfully!');
      fetchData(); // Refresh data after claiming
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim request');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getSeverityColor = (severity) => {
    if (severity >= 5) return '#dc3545';
    if (severity >= 4) return '#fd7e14';
    if (severity >= 3) return '#ffc107';
    return '#28a745';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'claimed':
        return '#007bff';
      case 'in-progress':
        return '#17a2b8';
      case 'resolved':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getResourceIcon = (type) => {
    const icons = {
      shelter: '🏠',
      food: '🍔',
      medical: '🏥',
      water: '💧',
      other: '📍'
    };
    return icons[type] || '📍';
  };

  if (loading) {
    return <div className="loading">Loading map...</div>;
  }

  // Default center - India (Delhi area)
  const defaultCenter = [28.6139, 77.2090]; // New Delhi, India

  return (
    <div className="map-view-page">
      <div className="container">
        <h1>Interactive Map Dashboard</h1>
        <SearchFilter onFilterChange={handleFilterChange} showDateFilter={true} />
        <div className="map-controls">
        <div className="legend">
          <h3>Legend</h3>
          <div className="legend-item">
            <span style={{ color: '#dc3545' }}>🔴</span> Critical Help Request
          </div>
          <div className="legend-item">
            <span style={{ color: '#fd7e14' }}>🟠</span> High Priority
          </div>
          <div className="legend-item">
            <span style={{ color: '#ffc107' }}>🟡</span> Medium Priority
          </div>
          <div className="legend-item">
            <span style={{ color: '#28a745' }}>🟢</span> Low Priority
          </div>
          <div className="legend-item">
            <span>🏠</span> Resources (Shelters, Food, Medical)
          </div>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Help Request Markers */}
            {filteredRequests.map((request) => {
              if (!request.location?.latitude || !request.location?.longitude) return null;
              return (
            <Marker
              key={request._id}
              position={[request.location.latitude, request.location.longitude]}
              icon={new Icon({
                iconUrl: `data:image/svg+xml;base64,${btoa(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25">
                    <circle cx="12.5" cy="12.5" r="10" fill="${getPriorityColor(request.priority)}" stroke="white" stroke-width="2"/>
                    <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text>
                  </svg>`
                )}`,
                iconSize: [25, 25],
                iconAnchor: [12.5, 25]
              })}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{request.title}</h4>
                  <p>{request.description}</p>
                  <div className="popup-details">
                    <span className={`badge badge-${request.priority}`}>{request.priority}</span>
                    <span className={`badge badge-${request.status}`}>{request.status}</span>
                  </div>
                  <p><strong>Category:</strong> {request.category}</p>
                  {request.civilian && (
                    <p><strong>From:</strong> {request.civilian.name}</p>
                  )}
                  {request.claimedBy && (
                    <p><strong>Claimed by:</strong> {request.claimedBy.name}</p>
                  )}
                  {(user?.role === 'volunteer' || user?.role === 'admin') &&
                    request.status === 'pending' && (
                      <button
                        onClick={() => handleClaimRequest(request._id)}
                        className="btn btn-success"
                        style={{ marginTop: '10px', width: '100%' }}
                      >
                        Claim Request
                      </button>
                    )}
                </div>
              </Popup>
            </Marker>
              );
            })}

            {/* Incident Markers */}
            {filteredIncidents.map((incident) => {
              if (!incident.latitude || !incident.longitude) return null;
              return (
                <Marker
                  key={`incident-${incident._id}`}
                  position={[incident.latitude, incident.longitude]}
                  icon={new Icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25">
                        <circle cx="12.5" cy="12.5" r="10" fill="${getSeverityColor(incident.severity)}" stroke="white" stroke-width="2"/>
                        <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text>
                      </svg>`
                    )}`,
                    iconSize: [25, 25],
                    iconAnchor: [12.5, 25]
                  })}
                >
                  <Popup>
                    <div className="popup-content">
                      <h4>{incident.type}</h4>
                      <p>{incident.description}</p>
                      <div className="popup-details">
                        <span className={`badge badge-${incident.severity >= 4 ? 'critical' : incident.severity >= 3 ? 'high' : 'medium'}`}>
                          Severity: {incident.severity}/5
                        </span>
                        <span className={`badge badge-${incident.status === 0 ? 'pending' : incident.status === 1 ? 'claimed' : 'resolved'}`}>
                          {['Pending', 'Verified', 'Ongoing', 'Completed'][incident.status] || 'Unknown'}
                        </span>
                      </div>
                      <p><strong>Location:</strong> {incident.location}</p>
                      {incident.reportedBy && (
                        <p><strong>Reported by:</strong> {incident.reportedBy?.name || 'Unknown'}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* Resource Markers */}
            {resources.map((resource) => {
              if (!resource.location?.latitude || !resource.location?.longitude) return null;
              return (
            <Marker
              key={resource._id}
              position={[resource.location.latitude, resource.location.longitude]}
              icon={new Icon({
                iconUrl: `data:image/svg+xml;base64,${btoa(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                    <circle cx="15" cy="15" r="12" fill="#007bff" stroke="white" stroke-width="2"/>
                    <text x="15" y="20" text-anchor="middle" fill="white" font-size="16">${getResourceIcon(resource.type)}</text>
                  </svg>`
                )}`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{resource.name}</h4>
                  <p><strong>Type:</strong> {resource.type}</p>
                  {resource.description && <p>{resource.description}</p>}
                  {resource.capacity && (
                    <p>
                      <strong>Capacity:</strong> {resource.currentOccupancy}/{resource.capacity}
                    </p>
                  )}
                  {resource.contact && (
                    <div>
                      {resource.contact.phone && <p><strong>Phone:</strong> {resource.contact.phone}</p>}
                      {resource.contact.email && <p><strong>Email:</strong> {resource.contact.email}</p>}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
              );
            })}
        </MapContainer>
      </div>

      <div className="map-summary">
        <div className="summary-card">
          <h3>Help Requests</h3>
            <p className="summary-number">{totalHelpRequests}</p>
        </div>
        <div className="summary-card">
          <h3>Resources</h3>
            <p className="summary-number">{totalResources}</p>
        </div>
        <div className="summary-card">
          <h3>Pending Requests</h3>
            <p className="summary-number">{totalPending}</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MapView;
