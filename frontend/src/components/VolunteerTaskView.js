import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './VolunteerTaskView.css';

const VolunteerTaskView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);

  // Get volunteer profile
  const { data: volunteerProfile } = useQuery({
    queryKey: ['volunteerProfile', user?.id],
    queryFn: async () => {
      const response = await api.get(`/api/tasks/user/${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id && (user?.role === 'volunteer' || user?.role === 'admin')
  });

  // Fetch tasks assigned to this volunteer
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['volunteerTasks', volunteerProfile?._id],
    queryFn: async () => {
      if (!volunteerProfile?._id) return [];
      const response = await api.get(`/api/tasks/volunteer/${volunteerProfile._id}`);
      return response.data || [];
    },
    enabled: !!volunteerProfile?._id
  });

  // Update task status mutation
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

    if (window.confirm(`Are you sure you want to ${status === 2 ? 'accept' : 'reject'} this task?`)) {
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
      1: '#ffc107',
      2: '#28a745',
      3: '#dc3545',
      4: '#17a2b8'
    };
    return colorMap[status] || '#6c757d';
  };

  const getSeverityColor = (severity) => {
    if (severity >= 4) return '#dc3545';
    if (severity >= 3) return '#ffc107';
    return '#28a745';
  };

  if (tasksLoading) {
    return <div className="volunteer-task-view-container"><p>Loading tasks...</p></div>;
  }

  return (
    <div className="volunteer-task-view-container">
      <div className="volunteer-task-header">
        <h2>📋 My Assigned Tasks</h2>
        <p>View and manage tasks assigned to you</p>
      </div>

      {!volunteerProfile ? (
        <div className="no-profile-message">
          <p>Volunteer profile not found. Please contact administrator.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="no-tasks-message">
          <p>No tasks assigned yet. Admin will assign tasks based on verified incidents.</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
            <div key={task._id} className="task-card">
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
                      ✓ Accept
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleTaskAction(task._id, 3)}
                      disabled={updateTaskStatusMutation.isPending}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>

              <p className="task-description">{task.description}</p>

              {task.incident && (
                <div className="incident-info">
                  <h4>Related Incident:</h4>
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
                      <a
                        href={`https://www.google.com/maps?q=${task.incident.latitude},${task.incident.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-link"
                      >
                        📍 View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="task-meta">
                <p><strong>Assigned:</strong> {new Date(task.createdAt).toLocaleString()}</p>
                {task.acceptedAt && (
                  <p><strong>Accepted:</strong> {new Date(task.acceptedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerTaskView;


