require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const resourceRoutes = require('./routes/resources');
const volunteerRoutes = require('./routes/volunteers');
const alertRoutes = require('./routes/alerts');
const incidentRoutes = require('./routes/incidents');
const taskRoutes = require('./routes/tasks');
const volunteerProfileRoutes = require('./routes/volunteerProfiles');
const twilioRoutes = require('./routes/twilio');

const app = express();
const server = http.createServer(app);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Security Middleware
if (isProduction) {
  // Helmet for security headers (production only)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production, 1000 in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS Configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/volunteer-profiles', volunteerProfileRoutes);
app.use('/api/twilio', twilioRoutes);

// Socket.io connection handling with room support
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle volunteer joining the 'volunteers' room
  socket.on('join-volunteers', () => {
    socket.join('volunteers');
    const volunteersRoom = io.sockets.adapter.rooms.get('volunteers');
    console.log(`Client ${socket.id} joined 'volunteers' room. Total volunteers: ${volunteersRoom ? volunteersRoom.size : 0}`);
  });

  // Handle volunteer leaving the 'volunteers' room
  socket.on('leave-volunteers', () => {
    socket.leave('volunteers');
    console.log(`Client ${socket.id} left 'volunteers' room`);
  });

  // Handle volunteer joining their specific room (by volunteer profile ID)
  socket.on('join-volunteer', (volunteerId) => {
    if (volunteerId) {
      socket.join(`volunteer-${volunteerId}`);
      console.log(`Client ${socket.id} joined 'volunteer-${volunteerId}' room`);
    }
  });

  // Handle volunteer leaving their specific room
  socket.on('leave-volunteer', (volunteerId) => {
    if (volunteerId) {
      socket.leave(`volunteer-${volunteerId}`);
      console.log(`Client ${socket.id} left 'volunteer-${volunteerId}' room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Make io available globally for Mongoose models
global.io = io;

// Initialize models with Socket.io instance
const HelpRequest = require('./models/HelpRequest');
HelpRequest.setSocketIO(io);

// Error Handling Middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose error details in production
  if (isProduction) {
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      ...(err.status === 500 ? {} : { error: err.message })
    });
  } else {
    // Development: show full error details
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      error: err.message,
      stack: err.stack
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.path
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-management')
.then(() => {
  console.log('✅ MongoDB connected');
  if (!isProduction) {
    console.log('   Environment: Development');
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  if (isProduction) {
    console.error('   Database connection failed in production!');
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

// Handle port already in use error gracefully
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🔗 Client URL: ${CLIENT_URL}`);
  if (isProduction) {
    console.log(`🔒 Security: Helmet enabled, Rate limiting active`);
  }
  console.log('');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error('Please kill the process using this port or use a different port.');
    console.error('\nTo kill the process on Windows, run:');
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error(`  taskkill /PID <PID> /F`);
    console.error('\nOr restart your terminal and try again.\n');
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️ SIGTERM signal received: closing HTTP server');
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ HTTP server closed');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\n⚠️ SIGINT signal received: closing HTTP server');
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log('✅ HTTP server closed');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

module.exports = { io };

