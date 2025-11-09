import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './TaskManagement.css';

const TaskManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    taskType: '',
    description: '',
    incident: '',
    skill: '',
    volunteer: '',
    extraData: {}
  });

  // Fetch skills
  const { data: skills = [], isLoading: skillsLoading, error: skillsError, refetch: refetchSkills } = useQuery({
    queryKey: ['taskSkills'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/tasks/skills');
        console.log('TaskManagement: Fetched skills:', response.data);
        return response.data || [];
      } catch (error) {
        console.error('TaskManagement: Error fetching skills:', error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch verified incidents
  const { data: incidents = [], isLoading: incidentsLoading, error: incidentsError, refetch: refetchIncidents } = useQuery({
    queryKey: ['verifiedIncidents'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/tasks/incidents');
        console.log('TaskManagement: Fetched verified incidents:', response.data);
        return response.data || [];
      } catch (error) {
        console.error('TaskManagement: Error fetching incidents:', error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch ALL volunteers (no restrictions)
  const { data: volunteers = [] } = useQuery({
    queryKey: ['availableVolunteers', formData.skill],
    queryFn: async () => {
      try {
        // Fetch ALL volunteers regardless of status or skills
        const response = await api.get('/api/volunteer-profiles');
        return response.data || [];
      } catch (error) {
        console.error('TaskManagement: Error fetching volunteers:', error);
        return [];
      }
    },
    enabled: !!user && user.role === 'admin'
  });

  // Fetch all tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['allTasks'],
    queryFn: async () => {
      const response = await api.get('/api/tasks');
      return response.data || [];
    },
    enabled: !!user && user.role === 'admin'
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      return api.post('/api/tasks/add', taskData);
    },
    onSuccess: () => {
      toast.success('Task assigned successfully!');
      setFormData({
        taskType: '',
        description: '',
        incident: '',
        skill: '',
        volunteer: '',
        extraData: {}
      });
      queryClient.invalidateQueries(['allTasks']);
      queryClient.invalidateQueries(['availableVolunteers']);
      // Also invalidate volunteer tasks query (they'll see it via socket but this ensures it's there)
      queryClient.invalidateQueries(['volunteerTasks']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign task');
    }
  });

  const taskTypes = [
    'Rescue Operation Management',
    'Transportation and Distribution',
    'Medical Assistance',
    'Shelter Management',
    'Communication and Coordination',
    'Search and Rescue',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      // Reset volunteer when skill changes
      ...(name === 'skill' && { volunteer: '' })
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.taskType || !formData.description || !formData.volunteer) {
      toast.error('Please fill in all required fields');
      return;
    }

    assignTaskMutation.mutate({
      task: {
        taskType: formData.taskType,
        description: formData.description,
        incident: formData.incident || null, // Optional incident
        volunteer: formData.volunteer
      },
      extraData: formData.extraData
    });
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

  return (
    <div className="task-management-container">
      <div className="task-management-header">
        <h2>📋 Task Management</h2>
        <p>Assign tasks to volunteers based on verified incidents</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={() => {
              refetchIncidents();
              refetchSkills();
              toast.info('Refreshing data...');
            }}
            className="btn btn-secondary"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            🔄 Refresh Data
          </button>
        </div>
        <div style={{ marginTop: '10px', padding: '10px', background: '#d4edda', borderRadius: '6px', fontSize: '14px', border: '1px solid #c3e6cb' }}>
          <strong>✅ All volunteers can be assigned tasks</strong> - No restrictions on application status, task status, or skills.
        </div>
      </div>

      <div className="task-management-content">
        <div className="task-form-section">
          <h3>Assign New Task</h3>
          <form onSubmit={handleSubmit} className="task-form">
            <div className="form-group">
              <label>Task Type *</label>
              <select
                name="taskType"
                value={formData.taskType}
                onChange={handleChange}
                required
              >
                <option value="">Select task type</option>
                {taskTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the task..."
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label>Verified Incident</label>
              <select
                name="incident"
                value={formData.incident}
                onChange={handleChange}
              >
                <option value="">Select incident (optional)</option>
                {incidents.map(incident => (
                  <option key={incident._id} value={incident._id}>
                    {incident.type} - {incident.location} (Severity: {incident.severity}/5)
                  </option>
                ))}
              </select>
              {incidents.length === 0 && (
                <small style={{ color: '#6c757d' }}>
                  {incidentsLoading ? 'Loading incidents...' : incidentsError ? `Error: ${incidentsError.message}` : 'No verified incidents available. You can assign tasks without linking to an incident.'}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Required Skill</label>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
              >
                <option value="">Select skill (optional)</option>
                {skills.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              {skills.length === 0 && (
                <small style={{ color: '#6c757d' }}>
                  {skillsLoading ? 'Loading skills...' : skillsError ? `Error: ${skillsError.message}` : 'No skills available. You can still assign tasks without selecting a skill.'}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Available Volunteer *</label>
              <select
                name="volunteer"
                value={formData.volunteer}
                onChange={handleChange}
                required
                disabled={volunteers.length === 0}
              >
                <option value="">Select volunteer</option>
                {volunteers.map(volunteer => (
                  <option key={volunteer._id} value={volunteer._id}>
                    {volunteer.userId?.name || 'Unknown'} - {volunteer.userId?.email || ''}
                    {volunteer.skills && volunteer.skills.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {' '}(Skills: {volunteer.skills.join(', ')})
                      </span>
                    )}
                  </option>
                ))}
              </select>
              {volunteers.length === 0 && (
                <small style={{ color: '#6c757d' }}>
                  No volunteers found. Make sure volunteers are registered in the system.
                </small>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={assignTaskMutation.isPending}
            >
              {assignTaskMutation.isPending ? 'Assigning...' : 'Assign Task'}
            </button>
          </form>
        </div>

        <div className="task-list-section">
          <h3>All Tasks</h3>
          {tasksLoading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p>No tasks assigned yet</p>
          ) : (
            <div className="task-list">
              {tasks.map(task => (
                <div key={task._id} className="task-card">
                  <div className="task-header">
                    <h4>{task.taskType}</h4>
                    <span
                      className="task-status"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {getStatusText(task.status)}
                    </span>
                  </div>
                  <p className="task-description">{task.description}</p>
                  <div className="task-details">
                    {task.incident ? (
                      <p><strong>Incident:</strong> {task.incident?.type} - {task.incident?.location}</p>
                    ) : (
                      <p><strong>Incident:</strong> <em>Not linked to an incident</em></p>
                    )}
                    <p><strong>Volunteer:</strong> {task.volunteer?.userId?.name || 'Unknown'}</p>
                    <p><strong>Assigned:</strong> {new Date(task.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
