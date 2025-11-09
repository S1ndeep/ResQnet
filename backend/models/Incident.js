const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
    // e.g., "Fire", "Flood", "Earthquake", "Medical Emergency"
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5
    // 1 = Very Low, 2 = Low, 3 = Medium, 4 = High, 5 = Very High
  },
  description: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  // Geospatial coordinates for MongoDB 2dsphere queries
  coordinates: {
    type: [Number], // [longitude, latitude] format for GeoJSON
    index: '2dsphere'
  },
  status: {
    type: Number,
    default: 0,
    enum: [0, 1, 2, 3]
    // 0 = Pending, 1 = Verified, 2 = Ongoing, 3 = Completed
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Pre-save hook to set coordinates array for geospatial queries
incidentSchema.pre('save', function(next) {
  if (this.latitude && this.longitude) {
    // GeoJSON format: [longitude, latitude]
    this.coordinates = [this.longitude, this.latitude];
  }
  next();
});

// Create geospatial index
incidentSchema.index({ coordinates: '2dsphere' });
incidentSchema.index({ status: 1 });
incidentSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('Incident', incidentSchema);


