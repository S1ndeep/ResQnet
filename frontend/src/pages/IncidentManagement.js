/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import './IncidentManagement.css';

const IncidentManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const socketRef = useRef(null);

  // Fetch pending incidents
  const { data: pendingIncidents = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pendingIncidents'],
    queryFn: async () => {
      console.log('IncidentManagement: Fetching pending incidents...');
      const response = await api.get('/api/incidents/public-reports');
      console.log('IncidentManagement: Received pending incidents:', response.data?.length || 0);
      return response.data || [];
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch all incidents
  const { data: allIncidents = [], isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: async () => {
      console.log('IncidentManagement: Fetching all incidents...');
      const response = await api.get('/api/incidents');
      console.log('IncidentManagement: Received all incidents:', response.data?.length || 0);
      return response.data || [];
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Socket setup for real-time updates
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('IncidentManagement: Socket connected');
    });

    socketRef.current.on('new-incident', (incident) => {
      console.log('IncidentManagement: New incident via socket', incident);
      queryClient.invalidateQueries(['pendingIncidents']);
      queryClient.invalidateQueries(['allIncidents']);
      toast.info('New incident reported!');
    });

    socketRef.current.on('incident-verified', (incident) => {
      console.log('IncidentManagement: Incident verified via socket', incident);
      queryClient.invalidateQueries(['pendingIncidents']);
      queryClient.invalidateQueries(['allIncidents']);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, queryClient]);

  // Verify incident mutation
  const verifyIncidentMutation = useMutation({
    mutationFn: async (incidentId) => {
      return api.put(`/api/incidents/verify/${incidentId}`);
    },
    onSuccess: () => {
      toast.success('Incident verified and volunteers notified!');
      queryClient.invalidateQueries(['pendingIncidents']);
      queryClient.invalidateQueries(['allIncidents']);
      queryClient.invalidateQueries(['verifiedIncidents']); // Also invalidate TaskManagement query
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to verify incident');
    }
  });

  const handleVerify = (incidentId) => {
    if (window.confirm('Are you sure you want to verify this incident? This will notify all volunteers.')) {
      verifyIncidentMutation.mutate(incidentId);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      0: 'Pending',
      1: 'Verified',
      2: 'Ongoing',
      3: 'Completed'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      0: '#ffc107',
      1: '#28a745',
      2: '#17a2b8',
      3: '#6c757d'
    };
    return colorMap[status] || '#6c757d';
  };

  const getSeverityColor = (severity) => {
    if (severity >= 4) return '#dc3545';
    if (severity >= 3) return '#ffc107';
    return '#28a745';
  };

  return (
    <div className="incident-management-page">
      <div className="incident-management-container">
        <div className="incident-management-header">
          <h2>🚨 Incident Management</h2>
          <p>Review and verify incidents reported by civilians</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => {
                refetchPending();
                refetchAll();
                toast.info('Refreshing incidents...');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="incident-sections">
          <div className="pending-incidents-section">
            <h3>Pending Verification ({pendingIncidents.length})</h3>
            {pendingLoading ? (
              <p>Loading...</p>
            ) : pendingIncidents.length === 0 ? (
              <p className="no-incidents">No pending incidents</p>
            ) : (
              <div className="incident-list">
                {pendingIncidents.map(incident => (
                  <div key={incident._id} className="incident-card pending">
                    <div className="incident-header">
                      <h4>{incident.type}</h4>
                      <span
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(incident.severity) }}
                      >
                        Severity: {incident.severity}/5
                      </span>
                    </div>
                    <p className="incident-location">📍 {incident.location}</p>
                    <p className="incident-description">{incident.description}</p>
                    <div className="incident-meta">
                      <p><strong>Reported by:</strong> {incident.reportedBy?.name || 'Unknown'}</p>
                      <p><strong>Reported:</strong> {new Date(incident.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="incident-actions">
                      <button
                        className="btn btn-success"
                        onClick={() => handleVerify(incident._id)}
                        disabled={verifyIncidentMutation.isPending}
                      >
                        ✓ Verify Incident
                      </button>
                      <a
                        href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        📍 View on Map
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="all-incidents-section">
            <h3>All Incidents ({allIncidents.length})</h3>
            {allLoading ? (
              <p>Loading...</p>
            ) : allIncidents.length === 0 ? (
              <p className="no-incidents">No incidents found</p>
            ) : (
              <div className="incident-list">
                {allIncidents.map(incident => (
                  <div key={incident._id} className="incident-card">
                    <div className="incident-header">
                      <h4>{incident.type}</h4>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(incident.status) }}
                        >
                          {getStatusText(incident.status)}
                        </span>
                        <span
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(incident.severity) }}
                        >
                          {incident.severity}/5
                        </span>
                      </div>
                    </div>
                    <p className="incident-location">📍 {incident.location}</p>
                    <p className="incident-description">{incident.description}</p>
                    <div className="incident-meta">
                      <p><strong>Reported by:</strong> {incident.reportedBy?.name || 'Unknown'}</p>
                      {incident.verifiedBy && (
                        <p><strong>Verified by:</strong> {incident.verifiedBy?.name || 'Unknown'}</p>
                      )}
                      <p><strong>Reported:</strong> {new Date(incident.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentManagement;


