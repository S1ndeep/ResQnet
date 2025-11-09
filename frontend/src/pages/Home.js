import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Home.css';

// Component to handle map center updates
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: {
      latitude: null,
      longitude: null,
      address: ''
    },
    category: 'other',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default: New Delhi, India
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchActiveRequests();
    // Auto-detect location on component mount
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      toast.error('Geolocation is not supported by your browser. Please enter location manually.');
      return;
    }

    setGettingLocation(true);
    console.log('Home: Requesting geolocation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Home: Location obtained:', { latitude, longitude });
        
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            latitude,
            longitude,
            address: prev.location.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          }
        }));
        
        toast.success(`Location detected! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
        let errorMessage = 'Failed to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please enter location manually.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter location manually.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location. Please enter location manually.';
            break;
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 // Accept cached location up to 1 minute old
      }
    );
  };

  const fetchActiveRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // For unauthenticated users, try to fetch but don't show errors
        // In production, you might want a public endpoint
        return;
      }
      const response = await api.get('/api/requests');
      const activeRequests = (response.data || []).filter(
        r => r.status === 'pending' || r.status === 'claimed'
      );
      setRequests(activeRequests);
    } catch (error) {
      // Silently fail for unauthenticated users
      if (error.response?.status !== 401) {
        console.error('Error fetching requests:', error);
      }
    }
  };

  const handleLocationClick = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          latitude: userLocation[0],
          longitude: userLocation[1]
        }
      }));
    } else {
      getCurrentLocation();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category' || name === 'priority') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTriggerAlert = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to create an emergency alert');
      navigate('/login');
      return;
    }

    if (user.role !== 'civilian') {
      toast.error('Only civilians can create help requests');
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.location || !formData.location.latitude || !formData.location.longitude) {
      toast.error('Please allow location access or provide location manually');
      return;
    }

    if (formData.location.latitude === 0 && formData.location.longitude === 0) {
      toast.error('Please allow location access or provide location manually');
      return;
    }

    setLoading(true);
    try {
      console.log('Home: Submitting emergency alert');
      console.log('User:', { id: user._id, role: user.role, name: user.name });
      console.log('Form data:', JSON.stringify(formData, null, 2));
      
      const response = await api.post('/api/requests', formData);
      console.log('Home: Emergency alert created successfully', response.data);
      toast.success('Emergency alert created successfully! Volunteers will be notified.');
      setFormData({
        title: '',
        description: '',
        location: {
          latitude: userLocation ? userLocation[0] : null,
          longitude: userLocation ? userLocation[1] : null,
          address: ''
        },
        category: 'other',
        priority: 'medium'
      });
      fetchActiveRequests();
    } catch (error) {
      console.error('Home: Error creating alert', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create emergency alert';
      toast.error(errorMessage);
      if (error.response) {
        console.error('Full error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="home">
      <div className="hero">
        <h1>Disaster Management System</h1>
        <p>Connecting Help to Where It's Needed Most. Instantly.</p>
      </div>

      <div className="main-dashboard container">
        <div className="dashboard-grid">
          {/* Panel 1: Create Emergency Alert */}
          <div className="panel panel-left">
            <h2>Create Emergency Alert</h2>
            <form onSubmit={handleTriggerAlert} className="emergency-form">
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <div className="location-input-group">
                  <input
                    type="text"
                    id="location"
                    placeholder="Auto-detected or enter manually"
                    value={formData.location.address || 
                      (formData.location.latitude && formData.location.longitude 
                        ? `${formData.location.latitude.toFixed(4)}, ${formData.location.longitude.toFixed(4)}`
                        : '')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      location: { ...prev.location, address: e.target.value }
                    }))}
                    className="form-control"
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="btn btn-secondary btn-location"
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? '🔄 Getting Location...' : '📍 Use My Location'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="severity">Severity Level</label>
                <select
                  id="severity"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="medical">Medical</option>
                  <option value="shelter">Shelter</option>
                  <option value="food">Food</option>
                  <option value="rescue">Rescue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">Emergency Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Brief title (e.g., 'Trapped in building')"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Emergency Details</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your situation..."
                  rows="4"
                  className="form-control"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-trigger"
                disabled={loading}
              >
                {loading ? 'Creating Alert...' : '🚨 Trigger Alert'}
              </button>
            </form>
          </div>

          {/* Panel 2: Live Crisis Map */}
          <div className="panel panel-right">
            <h2>Live Crisis Map</h2>
            <div className="map-wrapper">
              <MapContainer
                center={mapCenter}
                zoom={6}
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
              >
                <MapController center={mapCenter} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {requests.map((request) => (
                  <Marker
                    key={request._id}
                    position={[request.location.latitude, request.location.longitude]}
                    icon={new Icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                          <circle cx="15" cy="15" r="12" fill="${getPriorityColor(request.priority)}" stroke="white" stroke-width="2"/>
                          <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
                        </svg>`
                      )}`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
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
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <button
                onClick={handleLocationClick}
                className="btn btn-location-track"
              >
                📍 Track My Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
