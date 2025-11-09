const express = require('express');
const router = express.Router();
const VolunteerProfile = require('../models/VolunteerProfile');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ============================================
// VOLUNTEER PROFILE MANAGEMENT
// ============================================

// Get all volunteers (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const volunteers = await VolunteerProfile.find({})
      .populate('userId', 'name email phone role')
      .sort({ createdAt: -1 });

    res.json(volunteers);
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single volunteer profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const volunteer = await VolunteerProfile.findById(req.params.id)
      .populate('userId', 'name email phone role');

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Volunteers can only see their own profile
    if (req.user.role === 'volunteer' && volunteer.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(volunteer);
  } catch (error) {
    console.error('Error fetching volunteer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update volunteer application status (admin only)
router.put('/:id/application-status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { applicationStatus } = req.body; // 0 = Pending, 1 = Accepted, 2 = Rejected

    if (applicationStatus === undefined || ![0, 1, 2].includes(applicationStatus)) {
      return res.status(400).json({ message: 'Valid applicationStatus (0, 1, or 2) is required' });
    }

    const volunteer = await VolunteerProfile.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    volunteer.applicationStatus = applicationStatus;
    await volunteer.save();

    const statusText = {
      0: 'Pending',
      1: 'Accepted',
      2: 'Rejected'
    }[applicationStatus];

    res.json({
      message: `Volunteer application ${statusText.toLowerCase()}`,
      volunteer
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update volunteer skills (admin only)
router.put('/:id/skills', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { skills } = req.body; // Array of skill strings

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'Skills must be an array' });
    }

    const volunteer = await VolunteerProfile.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    volunteer.skills = skills.filter(skill => skill && skill.trim()).map(skill => skill.trim());
    await volunteer.save();

    res.json({
      message: 'Volunteer skills updated',
      volunteer
    });
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update volunteer profile (volunteer can update their own, admin can update any)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { skills, bio, availability } = req.body;

    const volunteer = await VolunteerProfile.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Volunteers can only update their own profile
    if (req.user.role === 'volunteer' && volunteer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        volunteer.skills = skills.filter(skill => skill && skill.trim()).map(skill => skill.trim());
      }
    }

    if (bio !== undefined) {
      volunteer.bio = bio;
    }

    if (availability !== undefined) {
      volunteer.availability = availability;
    }

    await volunteer.save();

    res.json({
      message: 'Volunteer profile updated',
      volunteer
    });
  } catch (error) {
    console.error('Error updating volunteer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


