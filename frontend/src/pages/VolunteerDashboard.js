import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { FaMapMarkerAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './VolunteerDashboard.css';

const VolunteerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  
  // State for selected task
  const [selectedTask, setSelectedTask] = useState(null);

  // Get volunteer profile by user ID
  const { data: volunteerProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['volunteerProfile', user?.id || user?._id],
    queryFn: async () => {
      const userId = user?.id || user?._id;
      if (!userId) {
        console.log('VolunteerDashboard: No user ID available');
        return null;
      }
      console.log('VolunteerDashboard: Fetching volunteer profile for user:', userId);
      try {
        const response = await api.get(`/api/tasks/user/${userId}`);
        console.log('VolunteerDashboard: Received volunteer profile:', response.data);
        if (!response.data) {
          console.error('VolunteerDashboard: No volunteer profile found for user:', userId);
        }
        return response.data;
      } catch (error) {
        console.error('VolunteerDashboard: Error fetching volunteer profile:', error);
        return null;
      }
    },
    enabled: !!(user?.id || user?._id) && (user?.role === 'volunteer' || user?.role === 'admin'),
    retry: 2,
  });

  // Fetch tasks assigned to this volunteer
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['volunteerTasks', volunteerProfile?._id],
    queryFn: async () => {
      if (!volunteerProfile?._id) {
        console.log('VolunteerDashboard: No volunteer profile ID, returning empty array');
        return [];
      }
      console.log('VolunteerDashboard: Fetching tasks for volunteer:', volunteerProfile._id);
      try {
        const response = await api.get(`/api/tasks/volunteer/${volunteerProfile._id}`);
        console.log('VolunteerDashboard: Received tasks:', response.data?.length || 0, response.data);
        return response.data || [];
      } catch (error) {
        console.error('VolunteerDashboard: Error fetching tasks:', error);
        toast.error('Failed to load tasks. Please refresh.');
        return [];
      }
    },
    enabled: !!volunteerProfile?._id,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Socket setup for real-time task updates (simplified - only listen, don't join rooms)
  useEffect(() => {
    if (!volunteerProfile?._id) return;

    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
      console.log('VolunteerDashboard: Socket connected');
    });

    socketRef.current.on('task-assigned', (task) => {
      console.log('VolunteerDashboard: Task assigned via socket', task);
      // Simply invalidate and refetch - let React Query handle it
      queryClient.invalidateQueries(['volunteerTasks', volunteerProfile._id]);
    });

    socketRef.current.on('task-status-updated', () => {
      console.log('VolunteerDashboard: Task status updated via socket');
      queryClient.invalidateQueries(['volunteerTasks', volunteerProfile._id]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [volunteerProfile?._id, queryClient]);

  // Update task status mutation (Accept/Reject)
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ volunteerId, taskId, status }) => {
      return api.put(`/api/tasks/update-status/${volunteerId}/${taskId}`, { status });
    },
    onSuccess: () => {
      toast.success('Task status updated successfully!');
      queryClient.invalidateQueries(['volunteerTasks']);
      queryClient.invalidateQueries(['volunteerProfile']);
      setSelectedTask(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update task status');
    }
  });

  const handleTaskAction = (taskId, status) => {
    if (!volunteerProfile?._id) {
      toast.error('Volunteer profile not found');
      return;
    }

    const actionText = status === 2 ? 'accept' : 'reject';
    if (window.confirm(`Are you sure you want to ${actionText} this task?`)) {
      updateTaskStatusMutation.mutate({
        volunteerId: volunteerProfile._id,
        taskId,
        status
      });
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      1: 'Assigned',
      2: 'Accepted',
      3: 'Rejected',
      4: 'Completed'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      1: '#ffc107',  // Yellow for Assigned
      2: '#28a745',  // Green for Accepted
      3: '#dc3545',  // Red for Rejected
      4: '#17a2b8'   // Blue for Completed
    };
    return colorMap[status] || '#6c757d';
  };

  const getSeverityColor = (severity) => {
    if (severity >= 4) return '#dc3545'; // Red for High/Very High
    if (severity >= 3) return '#ffc107'; // Yellow for Medium
    return '#28a745'; // Green for Low/Very Low
  };

  const openMap = (latitude, longitude, label) => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}&label=${label}`, '_blank');
  };

  const loading = authLoading || profileLoading || tasksLoading;

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="volunteer-dashboard-page">
      <div className="container">
        <div className="volunteer-dashboard-header">
          <h1>📋 Volunteer Dashboard</h1>
          <p>Welcome, {user?.name}! View and manage your assigned tasks.</p>
        </div>

        {!volunteerProfile ? (
          <div className="no-profile-message" style={{ padding: '20px', textAlign: 'center' }}>
            {profileLoading ? (
              <p>Loading volunteer profile...</p>
            ) : profileError ? (
              <>
                <p>⚠️ Error loading volunteer profile: {profileError.message}</p>
                <button onClick={() => queryClient.invalidateQueries(['volunteerProfile', user?.id || user?._id])} className="btn btn-primary" style={{ marginTop: '10px' }}>
                  Retry
                </button>
              </>
            ) : (
              <p>⚠️ Volunteer profile not found. Please contact administrator.</p>
            )}
          </div>
        ) : loading ? (
          <div className="loading-container" style={{ minHeight: '200px' }}>
            <div className="loading-spinner"></div>
            <p>Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="no-tasks-message" style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>No Tasks Assigned</h3>
            <p>You don't have any assigned tasks at the moment.</p>
            <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
              Admin will assign tasks based on verified incidents. Check back later!
            </p>
            <button
              onClick={async () => {
                console.log('VolunteerDashboard: Manual refresh clicked');
                try {
                  queryClient.invalidateQueries(['volunteerTasks', volunteerProfile._id]);
                  await refetchTasks();
                  toast.success('Tasks refreshed!');
                } catch (error) {
                  console.error('VolunteerDashboard: Error refreshing:', error);
                  toast.error('Failed to refresh tasks');
                }
              }}
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
              disabled={tasksLoading}
            >
              {tasksLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        ) : (
          <>
            <div className="volunteer-stats" style={{ marginBottom: '30px' }}>
              <div className="stat-card">
                <h3>Total Tasks</h3>
                <p className="stat-number">{tasks.length}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Action</h3>
                <p className="stat-number">{tasks.filter(t => t.status === 1).length}</p>
              </div>
              <div className="stat-card">
                <h3>Accepted</h3>
                <p className="stat-number">{tasks.filter(t => t.status === 2).length}</p>
              </div>
              <div className="stat-card">
                <h3>Completed</h3>
                <p className="stat-number">{tasks.filter(t => t.status === 4).length}</p>
              </div>
            </div>

            <div className="task-list-section">
              <h2>My Assigned Tasks</h2>
              <div className="tasks-grid">
                {tasks.map(task => (
                  <div key={task._id} className="card task-card">
                    <div className="task-header">
                      <div>
                        <h3>{task.taskType}</h3>
                        <span
                          className="task-status-badge"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        >
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      {task.status === 1 && (
                        <div className="task-actions">
                          <button
                            className="btn btn-success"
                            onClick={() => handleTaskAction(task._id, 2)}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <FaCheckCircle /> Accept
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleTaskAction(task._id, 3)}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            <FaTimesCircle /> Reject
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="task-description">{task.description}</p>

                    {task.incident && (
                      <div className="incident-info">
                        <h4>📍 Related Incident:</h4>
                        <div className="incident-details">
                          <p><strong>Type:</strong> {task.incident.type}</p>
                          <p><strong>Location:</strong> {task.incident.location}</p>
                          <p>
                            <strong>Severity:</strong>{' '}
                            <span style={{ color: getSeverityColor(task.incident.severity) }}>
                              {task.incident.severity}/5
                            </span>
                          </p>
                          {task.incident.description && (
                            <p><strong>Description:</strong> {task.incident.description}</p>
                          )}
                          {task.incident.latitude && task.incident.longitude && (
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => openMap(task.incident.latitude, task.incident.longitude, 'Incident')}
                              style={{ marginTop: '10px' }}
                            >
                              <FaMapMarkerAlt /> View on Google Maps
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="task-meta">
                      <p><strong>Assigned:</strong> {new Date(task.createdAt).toLocaleString()}</p>
                      {task.acceptedAt && (
                        <p><strong>Accepted:</strong> {new Date(task.acceptedAt).toLocaleString()}</p>
                      )}
                      {task.completedAt && (
                        <p><strong>Completed:</strong> {new Date(task.completedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
