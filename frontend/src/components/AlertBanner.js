import React, { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import io from 'socket.io-client';
import './AlertBanner.css';

const AlertBanner = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/api/alerts');
      setAlerts(response.data.filter(alert => alert.isActive));
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    if (!user) return; // Only fetch alerts if user is logged in
    
    fetchAlerts();

    // Socket connection for real-time alerts
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    const handleNewAlert = (alert) => {
      setAlerts((prev) => [alert, ...prev]);
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

    socket.on('new-alert', handleNewAlert);
    socket.on('alert-updated', handleAlertUpdated);
    socket.on('alert-deleted', handleAlertDeleted);

    return () => {
      socket.off('new-alert', handleNewAlert);
      socket.off('alert-updated', handleAlertUpdated);
      socket.off('alert-deleted', handleAlertDeleted);
      socket.disconnect();
    };
  }, [user]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger':
        return <FaExclamationCircle />;
      case 'warning':
        return <FaExclamationTriangle />;
      case 'success':
        return <FaCheckCircle />;
      default:
        return <FaInfoCircle />;
    }
  };

  const activeAlerts = alerts.filter(
    (alert) => {
      if (!alert.isActive || dismissedAlerts.has(alert._id)) return false;
      // Filter by target audience
      if (alert.targetAudience === 'all') return true;
      if (!user) return false;
      if (alert.targetAudience === 'volunteers' && (user.role === 'volunteer' || user.role === 'admin')) return true;
      if (alert.targetAudience === 'civilians' && user.role === 'civilian') return true;
      return false;
    }
  );

  if (!user || activeAlerts.length === 0) return null;

  return (
    <div className="alert-banner-container">
      {activeAlerts.map((alert) => (
        <div
          key={alert._id}
          className={`alert-banner alert-${alert.type}`}
        >
          <div className="alert-content">
            <span className="alert-icon">{getAlertIcon(alert.type)}</span>
            <div className="alert-text">
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
          </div>
          <button
            className="alert-close"
            onClick={() => handleDismiss(alert._id)}
            aria-label="Dismiss alert"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;

