const express = require('express');
const router = express.Router();
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const { authMiddleware, adminMiddleware, volunteerMiddleware } = require('../middleware/auth');

// Get all volunteers
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const volunteers = await User.find({ role: 'volunteer' })
      .select('-password')
      .sort({ name: 1 });

    res.json(volunteers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get volunteer's claimed requests
router.get('/:id/claims', authMiddleware, async (req, res) => {
  try {
    // Allow volunteers to see their own claims, admins to see anyone's
    const volunteerId = req.user.role === 'admin' ? req.params.id : req.user._id;
    
    if (req.user.role !== 'admin' && req.user._id.toString() !== volunteerId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requests = await HelpRequest.find({ claimedBy: volunteerId })
      .populate('civilian', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get volunteer stats
router.get('/stats', authMiddleware, volunteerMiddleware, async (req, res) => {
  try {
    const volunteerId = req.user._id;

    const stats = {
      totalClaims: await HelpRequest.countDocuments({ claimedBy: volunteerId }),
      activeClaims: await HelpRequest.countDocuments({ 
        claimedBy: volunteerId, 
        status: { $in: ['claimed', 'in-progress'] } 
      }),
      resolvedClaims: await HelpRequest.countDocuments({ 
        claimedBy: volunteerId, 
        status: 'resolved' 
      })
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

