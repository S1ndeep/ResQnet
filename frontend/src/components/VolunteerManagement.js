import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './VolunteerManagement.css';

const VolunteerManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');

  // Fetch all volunteers
  const { data: volunteers = [], isLoading: volunteersLoading } = useQuery({
    queryKey: ['allVolunteers'],
    queryFn: async () => {
      const response = await api.get('/api/volunteer-profiles');
      return response.data || [];
    },
    enabled: !!user && user.role === 'admin'
  });

  // Update application status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ volunteerId, applicationStatus }) => {
      return api.put(`/api/volunteer-profiles/${volunteerId}/application-status`, { applicationStatus });
    },
    onSuccess: () => {
      toast.success('Volunteer status updated');
      queryClient.invalidateQueries(['allVolunteers']);
      queryClient.invalidateQueries(['taskSkills']); // Also invalidate skills query
      setSelectedVolunteer(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });

  // Update skills mutation
  const updateSkillsMutation = useMutation({
    mutationFn: async ({ volunteerId, skills }) => {
      return api.put(`/api/volunteer-profiles/${volunteerId}/skills`, { skills });
    },
    onSuccess: () => {
      toast.success('Skills updated');
      queryClient.invalidateQueries(['allVolunteers']);
      queryClient.invalidateQueries(['taskSkills']); // Also invalidate skills query
      setEditingSkills(false);
      setSelectedVolunteer(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update skills');
    }
  });

  const handleAccept = (volunteerId) => {
    if (window.confirm('Accept this volunteer?')) {
      updateStatusMutation.mutate({ volunteerId, applicationStatus: 1 });
    }
  };

  const handleReject = (volunteerId) => {
    if (window.confirm('Reject this volunteer?')) {
      updateStatusMutation.mutate({ volunteerId, applicationStatus: 2 });
    }
  };

  const handleEditSkills = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setSkillsInput(volunteer.skills.join(', '));
    setEditingSkills(true);
  };

  const handleSaveSkills = () => {
    if (!selectedVolunteer) return;
    
    const skillsArray = skillsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    updateSkillsMutation.mutate({
      volunteerId: selectedVolunteer._id,
      skills: skillsArray
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      0: 'Pending',
      1: 'Accepted',
      2: 'Rejected'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      0: '#ffc107',
      1: '#28a745',
      2: '#dc3545'
    };
    return colorMap[status] || '#6c757d';
  };

  const getTaskStatusText = (status) => {
    const statusMap = {
      0: 'Available',
      1: 'Assigned',
      2: 'Accepted',
      3: 'Rejected',
      4: 'Completed'
    };
    return statusMap[status] || 'Unknown';
  };

  if (volunteersLoading) {
    return <div className="volunteer-management-container"><p>Loading volunteers...</p></div>;
  }

  return (
    <div className="volunteer-management-container">
      <div className="volunteer-management-header">
        <h2>👥 Volunteer Management</h2>
        <p>Manage volunteer applications, accept/reject volunteers, and assign skills</p>
      </div>

      {volunteers.length === 0 ? (
        <div className="no-volunteers">
          <p>No volunteers registered yet</p>
        </div>
      ) : (
        <div className="volunteer-list">
          {volunteers.map(volunteer => (
            <div key={volunteer._id} className="volunteer-card">
              <div className="volunteer-header">
                <div>
                  <h3>{volunteer.userId?.name || 'Unknown'}</h3>
                  <p className="volunteer-email">{volunteer.userId?.email || ''}</p>
                </div>
                <div className="status-badges">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(volunteer.applicationStatus) }}
                  >
                    {getStatusText(volunteer.applicationStatus)}
                  </span>
                  <span className="task-status-badge">
                    {getTaskStatusText(volunteer.taskStatus)}
                  </span>
                </div>
              </div>

              <div className="volunteer-details">
                <div className="skills-section">
                  <strong>Skills:</strong>
                  {volunteer.skills && volunteer.skills.length > 0 ? (
                    <div className="skills-list">
                      {volunteer.skills.map((skill, idx) => (
                        <span key={idx} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-skills">No skills added</span>
                  )}
                </div>

                {volunteer.bio && (
                  <div className="bio-section">
                    <strong>Bio:</strong>
                    <p>{volunteer.bio}</p>
                  </div>
                )}
              </div>

              <div className="volunteer-actions">
                {volunteer.applicationStatus === 0 && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleAccept(volunteer._id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      ✓ Accept
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReject(volunteer._id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEditSkills(volunteer)}
                >
                  ✏️ Edit Skills
                </button>
              </div>

              {editingSkills && selectedVolunteer?._id === volunteer._id && (
                <div className="edit-skills-form">
                  <label>Skills (comma-separated):</label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="e.g., Rescue Operator, Medical Assistant, Transportation"
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveSkills}
                      disabled={updateSkillsMutation.isPending}
                    >
                      Save Skills
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingSkills(false);
                        setSelectedVolunteer(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerManagement;


