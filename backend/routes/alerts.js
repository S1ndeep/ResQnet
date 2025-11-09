const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all alerts (Admin only - for management) - MUST come before /:id route
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active alerts (filtered by target audience)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    let query = { isActive: true };

    // Filter by target audience
    if (role === 'civilian') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'civilians' }
      ];
    } else if (role === 'volunteer') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'volunteers' }
      ];
    } else if (role === 'admin') {
      // Admins see all alerts
    }

    const alerts = await Alert.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10); // Get latest 10 active alerts

    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single alert
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create alert (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, message, type, targetAudience } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const alert = new Alert({
      title,
      message,
      type: type || 'info',
      targetAudience: targetAudience || 'all',
      createdBy: req.user._id
    });

    await alert.save();
    await alert.populate('createdBy', 'name email');

    // Emit socket event to notify all users
    const io = req.app.get('io');
    io.emit('new-alert', alert);

    res.status(201).json(alert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update alert (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const { title, message, type, targetAudience, isActive } = req.body;

    if (title) alert.title = title;
    if (message) alert.message = message;
    if (type) alert.type = type;
    if (targetAudience) alert.targetAudience = targetAudience;
    if (isActive !== undefined) alert.isActive = isActive;

    await alert.save();
    await alert.populate('createdBy', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('alert-updated', alert);

    res.json(alert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete alert (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Soft delete
    alert.isActive = false;
    await alert.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('alert-deleted', { id: req.params.id });

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

