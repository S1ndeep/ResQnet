const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  civilian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    // Geospatial coordinates for MongoDB 2dsphere queries
    coordinates: {
      type: [Number], // [longitude, latitude] format for GeoJSON
      index: '2dsphere'
    }
  },
  category: {
    type: String,
    enum: ['medical', 'shelter', 'food', 'rescue', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'in-progress', 'resolved', 'cancelled'],
    default: 'pending'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

// === START: ROBUST SAVE HOOKS ===

// 1. PRE-SAVE HOOK:
// Runs *before* validation & save.
// We use this to check if the document is truly new AND set coordinates.
requestSchema.pre('save', function(next) {
  // Set coordinates for geospatial queries
  if (this.location && this.location.latitude && this.location.longitude) {
    // GeoJSON format: [longitude, latitude]
    this.location.coordinates = [this.location.longitude, this.location.latitude];
  }
  
  // 'this.isNew' is TRUE here if it's a new document
  // Set a temporary flag on the document that will be available in the 'post' hook
  if (this.isNew) {
    this._wasNew = true;
  }
  
  next();
});

// Create geospatial index
requestSchema.index({ 'location.coordinates': '2dsphere' });
requestSchema.index({ status: 1, claimedBy: 1 }); // Compound index for common queries

// Store Socket.io instance
let socketIO = null;

// Function to set Socket.io instance (called from server.js)
requestSchema.statics.setSocketIO = function(io) {
  socketIO = io;
  console.log('HelpRequest model: Socket.io instance registered');
};

// 2. POST-SAVE HOOK:
// Runs *after* a successful save.
// 'doc' is the document that was just saved.
requestSchema.post('save', async function(doc, next) {
  try {
    // Check our temporary flag set in pre-save hook
    // AND ensure the status is 'pending' (we don't care about drafts, etc.)
    if (this._wasNew && doc.status === 'pending') {
      
      // *** THIS IS THE LOG WE MUST SEE IN THE SERVER TERMINAL ***
      console.log(`\n\n[!!!] POST-SAVE HOOK: Document was new. Emitting 'new-request' for ID: ${doc._id} [!!!]\n\n`);

      try {
        // Get the Socket.io instance
        if (socketIO) {
          // Populate civilian data *before* emitting
          // We must populate 'doc' *again* to ensure it's populated
          const populatedDoc = await doc.populate('civilian', 'name email phone');
          
          // Convert to plain object for socket emission
          let requestData;
          try {
            requestData = JSON.parse(JSON.stringify(populatedDoc.toObject ? populatedDoc.toObject() : populatedDoc));
          } catch (e) {
            requestData = populatedDoc.toObject ? populatedDoc.toObject() : populatedDoc;
            // Manually serialize problematic fields
            if (requestData.civilian && typeof requestData.civilian === 'object') {
              requestData.civilian = {
                _id: requestData.civilian._id,
                name: requestData.civilian.name,
                email: requestData.civilian.email,
                phone: requestData.civilian.phone
              };
            }
          }
          
          // Ensure critical fields are set
          requestData.claimedBy = null;
          requestData.status = requestData.status || 'pending';
          
          // Ensure coordinates are present
          if (requestData.location && !requestData.location.coordinates && requestData.location.latitude && requestData.location.longitude) {
            requestData.location.coordinates = [requestData.location.longitude, requestData.location.latitude];
          }
          
          // Emit the correct event name: 'new-request'
          // Emit to 'volunteers' room (better pattern) and also broadcast to all (fallback)
          socketIO.to('volunteers').emit('new-request', requestData);
          socketIO.emit('new-request', requestData); // Also broadcast to all clients as fallback
          
          const connectedClients = socketIO.sockets.sockets.size;
          const volunteersRoom = socketIO.sockets.adapter.rooms.get('volunteers');
          const volunteersCount = volunteersRoom ? volunteersRoom.size : 0;
          
          console.log(`[POST-SAVE HOOK] Emitted 'new-request' to 'volunteers' room (${volunteersCount} clients) and broadcast to all (${connectedClients} total clients)`);
          console.log('[POST-SAVE HOOK] Event payload:', {
            _id: requestData._id,
            title: requestData.title,
            status: requestData.status,
            claimedBy: requestData.claimedBy,
            civilian: requestData.civilian?.name || requestData.civilian,
            hasLocation: !!requestData.location,
            hasCoordinates: !!requestData.location?.coordinates
          });

        } else {
          console.warn('[POST-SAVE HOOK] Socket.io instance (socketIO) is NOT available. Event not emitted.');
        }
      } catch (error) {
        console.error('[POST-SAVE HOOK] Error emitting socket event:', error);
        console.error('[POST-SAVE HOOK] Error stack:', error.stack);
      }
    }
    
    // Emit update event when status changes to 'claimed'
    if (!this._wasNew && this.isModified('status') && doc.status === 'claimed' && doc.claimedBy) {
      await doc.populate('civilian', 'name email phone');
      await doc.populate('claimedBy', 'name email phone');
      
      const requestData = doc.toObject ? doc.toObject() : doc;
      
      if (socketIO) {
        socketIO.to('volunteers').emit('request-claimed', requestData);
        socketIO.emit('request-claimed', requestData);
        console.log('[POST-SAVE HOOK] Socket event "request-claimed" emitted');
      }
    }
    
    // Emit update event for other status changes
    if (!this._wasNew && this.isModified('status') && doc.status !== 'pending' && doc.status !== 'claimed') {
      await doc.populate('civilian', 'name email phone');
      await doc.populate('claimedBy', 'name email phone');
      
      const requestData = doc.toObject ? doc.toObject() : doc;
      
      if (socketIO) {
        socketIO.to('volunteers').emit('request-updated', requestData);
        socketIO.emit('request-updated', requestData);
        console.log('[POST-SAVE HOOK] Socket event "request-updated" emitted');
      }
    }
    
    next();
  } catch (error) {
    console.error('[POST-SAVE HOOK] Error in post-save hook:', error);
    console.error('[POST-SAVE HOOK] Error stack:', error.stack);
    // Don't fail the save operation if socket emission fails
    next();
  }
});

// === END: ROBUST SAVE HOOKS ===

module.exports = mongoose.model('HelpRequest', requestSchema);

