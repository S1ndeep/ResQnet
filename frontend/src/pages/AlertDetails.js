import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './AlertDetails.css';

const AlertDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await api.get(`/api/requests/${id}`);
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to load request details');
      navigate('/volunteer');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRescue = async () => {
    if (!user || (user.role !== 'volunteer' && user.role !== 'admin')) {
      toast.error('Only volunteers can claim requests');
      return;
    }

    try {
      await api.post(`/api/requests/${id}/claim`);
      toast.success('Rescue claimed successfully! The person in need will be notified.');
      fetchRequestDetails();
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.response?.data?.message || 'Failed to claim request');
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!request) {
    return <div className="error">Request not found</div>;
  }

  const mapCenter = [request.location.latitude, request.location.longitude];

  return (
    <div className="alert-details-page">
      <div className="container">
        <button onClick={() => navigate('/volunteer')} className="btn btn-secondary btn-back">
          ← Back to Volunteer Dashboard
        </button>

        <div className="alert-details-content">
          <div className="alert-info-panel">
            <h1>{request.title}</h1>
            <div className="alert-meta">
              <span className={`badge badge-${request.priority}`}>{request.priority}</span>
              <span className={`badge badge-${request.status}`}>{request.status}</span>
              <span className="badge badge-category">{request.category}</span>
            </div>

            <div className="alert-section">
              <h3>Emergency Details</h3>
              <p>{request.description}</p>
            </div>

            <div className="alert-section">
              <h3>Location</h3>
              <p>{request.location.address || `${request.location.latitude.toFixed(4)}, ${request.location.longitude.toFixed(4)}`}</p>
            </div>

            {request.civilian && (
              <div className="alert-section">
                <h3>Requested By</h3>
                <p>{request.civilian.name}</p>
                {request.civilian.email && <p className="text-secondary">{request.civilian.email}</p>}
                {request.civilian.phone && <p className="text-secondary">{request.civilian.phone}</p>}
              </div>
            )}

            {request.claimedBy ? (
              <div className="alert-section">
                <h3>Claimed By</h3>
                <p>{request.claimedBy.name}</p>
                {request.claimedBy.email && <p className="text-secondary">{request.claimedBy.email}</p>}
                {request.claimedBy.phone && <p className="text-secondary">{request.claimedBy.phone}</p>}
              </div>
            ) : (
              <div className="alert-actions">
                <button
                  onClick={handleClaimRescue}
                  className="btn btn-primary btn-claim"
                  disabled={user?.role !== 'volunteer' && user?.role !== 'admin'}
                >
                  🚨 Claim Rescue
                </button>
                {user?.role !== 'volunteer' && user?.role !== 'admin' && (
                  <p className="claim-notice">Only volunteers can claim rescue requests</p>
                )}
              </div>
            )}
          </div>

          <div className="alert-map-panel">
            <h2>Location Map</h2>
            <div className="map-container">
              <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker
                  position={mapCenter}
                  icon={new Icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="15" fill="${getPriorityColor(request.priority)}" stroke="white" stroke-width="3"/>
                        <text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold">!</text>
                      </svg>`
                    )}`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                  })}
                >
                  <Popup>
                    <div>
                      <h4>{request.title}</h4>
                      <p>{request.description}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetails;

