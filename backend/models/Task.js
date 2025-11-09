const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskType: {
    type: String,
    required: true,
    trim: true
    // e.g., "Rescue Operation Management", "Transportation and Distribution", "Medical Assistance"
  },
  description: {
    type: String,
    required: true
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: false,
    default: null
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VolunteerProfile',
    required: true
  },
  status: {
    type: Number,
    default: 1,
    enum: [1, 2, 3, 4]
    // 1 = Assigned, 2 = Accepted, 3 = Rejected, 4 = Completed
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Admin who assigned the task
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  extraDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Task-specific additional data (e.g., shelter location, resource type, etc.)
  },
  notes: [{
    text: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
taskSchema.index({ volunteer: 1, status: 1 });
taskSchema.index({ incident: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);


