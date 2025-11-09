import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaExclamationCircle, FaClock } from 'react-icons/fa';
import './Alerts.css';

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = React.useRef(null);

  const fetchAlerts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/alerts');
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load alerts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    if (!user) return;

    // Socket connection for real-time alerts
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    const handleNewAlert = (alert) => {
      if (alert.isActive) {
        setAlerts((prev) => [alert, ...prev]);
        toast.info(`New alert: ${alert.title}`);
      }
    };

    const handleAlertUpdated = (alert) => {
      setAlerts((prev) =>
        prev.map((a) => (a._id === alert._id ? alert : a))
      );
    };

    const handleAlertDeleted = (data) => {
      const id = data?.id || data?._id || data;
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    };

    socketRef.current.on('new-alert', handleNewAlert);
    socketRef.current.on('alert-updated', handleAlertUpdated);
    socketRef.current.on('alert-deleted', handleAlertDeleted);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-alert', handleNewAlert);
        socketRef.current.off('alert-updated', handleAlertUpdated);
        socketRef.current.off('alert-deleted', handleAlertDeleted);
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger':
        return <FaExclamationCircle className="alert-icon" />;
      case 'warning':
        return <FaExclamationTriangle className="alert-icon" />;
      case 'success':
        return <FaCheckCircle className="alert-icon" />;
      default:
        return <FaInfoCircle className="alert-icon" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'danger':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'success':
        return '#28a745';
      default:
        return '#17a2b8';
    }
  };

  const getTargetAudienceText = (audience) => {
    switch (audience) {
      case 'all':
        return 'All Users';
      case 'volunteers':
        return 'Volunteers';
      case 'civilians':
        return 'Civilians';
      default:
        return audience;
    }
  };

  return (
    <div className="alerts-page">
      <div className="container">
        <h1>Active Alerts & Broadcasts</h1>
        
        {!user ? (
          <div className="alerts-login-prompt">
            <p>Please login to view active alerts and broadcasts.</p>
          </div>
        ) : loading ? (
          <div className="alerts-loading">
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="alerts-empty">
            <FaInfoCircle style={{ fontSize: '48px', color: '#6c757d', marginBottom: '20px' }} />
            <h3>No Active Alerts</h3>
            <p>There are currently no active alerts or broadcasts.</p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#999' }}>
              Administrators will post important updates and emergency information here.
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="alert-card"
                style={{
                  borderLeft: `4px solid ${getAlertColor(alert.type)}`,
                  backgroundColor: `${getAlertColor(alert.type)}10`
                }}
              >
                <div className="alert-header">
                  <div className="alert-title-section">
                    <span style={{ color: getAlertColor(alert.type) }}>
                      {getAlertIcon(alert.type)}
                    </span>
                    <h3>{alert.title}</h3>
                  </div>
                  <div className="alert-badges">
                    <span className="alert-badge" style={{ backgroundColor: getAlertColor(alert.type) }}>
                      {alert.type.toUpperCase()}
                    </span>
                    <span className="alert-badge alert-badge-secondary">
                      {getTargetAudienceText(alert.targetAudience)}
                    </span>
                  </div>
                </div>
                <div className="alert-body">
                  <p>{alert.message}</p>
                </div>
                <div className="alert-footer">
                  <div className="alert-meta">
                    <FaClock style={{ fontSize: '12px', marginRight: '5px' }} />
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    {alert.createdBy && (
                      <>
                        <span style={{ margin: '0 10px' }}>•</span>
                        <span>By: {alert.createdBy.name || alert.createdBy.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;



