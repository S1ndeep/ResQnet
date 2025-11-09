import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import './ReportIncident.css';

const ReportIncident = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    location: '',
    type: '',
    severity: 3,
    description: '',
    latitude: 0,
    longitude: 0
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if running on HTTPS or localhost
  useEffect(() => {
    const isSecureContext = window.isSecureContext || 
      window.location.protocol === 'https:' || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    if (!isSecureContext && navigator.geolocation) {
      console.warn('ReportIncident: Geolocation may require HTTPS. Current protocol:', window.location.protocol);
    }
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Accept cached location up to 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData({
          ...formData,
          latitude: latitude,
          longitude: longitude
        });
        setGettingLocation(false);
        toast.success('Location captured successfully!');
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Failed to get location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access or enter coordinates manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Unknown error occurred.';
        }
        toast.error(errorMessage);
      },
      options
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'severity' ? parseInt(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.location || !formData.type || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      toast.error('Please capture your location or enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
      return;
    }

    // Validate severity
    if (formData.severity < 1 || formData.severity > 5) {
      toast.error('Severity must be between 1 and 5');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/api/incidents/report', {
        location: formData.location,
        type: formData.type,
        severity: formData.severity,
        description: formData.description,
        latitude: lat,
        longitude: lng
      });

      toast.success('Incident reported successfully! Admin will review and verify.');
      setFormData({
        location: '',
        type: '',
        severity: 3,
        description: '',
        latitude: 0,
        longitude: 0
      });
    } catch (error) {
      console.error('Error reporting incident:', error);
      toast.error(error.response?.data?.message || 'Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  const incidentTypes = [
    'Fire',
    'Flood',
    'Earthquake',
    'Medical Emergency',
    'Structural Collapse',
    'Power Outage',
    'Water Supply Issue',
    'Transportation Disruption',
    'Other'
  ];

  return (
    <div className="report-incident-container">
      <div className="report-incident-card">
        <div className="report-incident-header">
          <h2>🚨 Report Incident</h2>
          <p>Report an emergency or disaster incident. Admin will verify and assign volunteers.</p>
        </div>

        <form onSubmit={handleSubmit} className="report-incident-form">
          <div className="form-group">
            <label>Incident Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select incident type</option>
              {incidentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter location address"
              required
            />
          </div>

          <div className="form-group">
            <label>Severity *</label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              required
            >
              <option value={1}>1 - Very Low</option>
              <option value={2}>2 - Low</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - High</option>
              <option value={5}>5 - Very High</option>
            </select>
            <small>Select the severity level (1-5)</small>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the incident in detail..."
              rows="5"
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
            disabled={submitting}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {submitting ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIncident;


