const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all resources
router.get('/', authMiddleware, async (req, res) => {
  try {
    const resources = await Resource.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single resource
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create resource (Admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, type, description, location, capacity, contact } = req.body;

    if (!name || !type || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const resource = new Resource({
      name,
      type,
      description,
      location,
      capacity,
      contact,
      createdBy: req.user._id
    });

    await resource.save();
    await resource.populate('createdBy', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('new-resource', resource);

    res.status(201).json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update resource (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const { name, type, description, location, capacity, contact, isActive, currentOccupancy } = req.body;

    if (name) resource.name = name;
    if (type) resource.type = type;
    if (description !== undefined) resource.description = description;
    if (location) resource.location = location;
    if (capacity !== undefined) resource.capacity = capacity;
    if (contact) resource.contact = contact;
    if (isActive !== undefined) resource.isActive = isActive;
    if (currentOccupancy !== undefined) resource.currentOccupancy = currentOccupancy;

    await resource.save();
    await resource.populate('createdBy', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('resource-updated', resource);

    res.json(resource);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete resource (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Soft delete
    resource.isActive = false;
    await resource.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('resource-deleted', { id: req.params.id });

    res.json({ message: 'Resource deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

