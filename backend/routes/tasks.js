const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Incident = require('../models/Incident');
const VolunteerProfile = require('../models/VolunteerProfile');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ============================================
// TASK ROUTES (Admin-Mediated Flow)
// ============================================

// Get all unique skills from volunteers (only accepted volunteers)
router.get('/skills', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('GET /api/tasks/skills - Fetching skills from accepted volunteers...');
    
    const volunteers = await VolunteerProfile.find({
      applicationStatus: 1 // Only accepted volunteers
    });

    console.log(`Found ${volunteers.length} accepted volunteers`);

    const allSkills = new Set();
    volunteers.forEach(vol => {
      if (vol.skills && Array.isArray(vol.skills) && vol.skills.length > 0) {
        console.log(`Volunteer ${vol._id} has skills:`, vol.skills);
        vol.skills.forEach(skill => {
          if (skill && skill.trim()) {
            allSkills.add(skill.trim());
          }
        });
      } else {
        console.log(`Volunteer ${vol._id} has NO skills`);
      }
    });

    const skillsArray = Array.from(allSkills).sort();
    console.log(`Returning ${skillsArray.length} unique skills:`, skillsArray);

    res.json(skillsArray);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get volunteers by skill (NO RESTRICTIONS - returns all volunteers with that skill)
router.get('/volunteers/:skill', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { skill } = req.params;

    // Fetch ALL volunteers with the skill, regardless of status
    const volunteers = await VolunteerProfile.find({
      skills: skill // Only filter by skill, no other restrictions
    }).populate('userId', 'name email phone');

    console.log(`GET /api/tasks/volunteers/${skill} - Found ${volunteers.length} volunteers`);
    console.log('Volunteers:', volunteers.map(v => ({
      id: v._id,
      name: v.userId?.name,
      email: v.userId?.email,
      skills: v.skills,
      applicationStatus: v.applicationStatus,
      taskStatus: v.taskStatus
    })));

    res.json(volunteers);
  } catch (error) {
    console.error('Error fetching volunteers by skill:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all incidents (for admin to select when assigning tasks)
router.get('/incidents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('GET /api/tasks/incidents - Fetching verified incidents (status: 1)...');
    
    const incidents = await Incident.find({ status: 1 }) // Only verified incidents
      .sort({ severity: -1, createdAt: -1 })
      .populate('reportedBy', 'name email phone');

    console.log(`Found ${incidents.length} verified incidents`);
    console.log('Incidents:', incidents.map(inc => ({
      id: inc._id,
      type: inc.type,
      location: inc.location,
      status: inc.status
    })));

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STEP 4: Admin assigns task to volunteer
router.post('/add', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { task, extraData } = req.body;

    // Validate required fields
    if (!task || !task.taskType || !task.description || !task.volunteer) {
      return res.status(400).json({ message: 'Task type, description, and volunteer are required' });
    }

    // Verify incident exists and is verified (if provided)
    let incident = null;
    if (task.incident) {
      incident = await Incident.findById(task.incident);
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      if (incident.status !== 1) {
        return res.status(400).json({ message: 'Can only assign tasks to verified incidents' });
      }
    }

    // Verify volunteer exists (NO RESTRICTIONS - any volunteer can be assigned)
    const volunteer = await VolunteerProfile.findById(task.volunteer);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    // Removed all restrictions - any volunteer can be assigned a task

    // Step 1: Create main task
    const newTask = new Task({
      taskType: task.taskType,
      description: task.description,
      incident: task.incident || null, // ✅ Optional - Links to Incident if provided
      volunteer: task.volunteer, // ✅ Links to Volunteer
      status: 1, // 1 = Assigned
      assignedBy: req.user._id,
      extraDetails: extraData || {}
    });

    const savedTask = await newTask.save();
    // Only populate incident if it exists
    if (savedTask.incident) {
      await savedTask.populate('incident', 'location type severity');
    }
    await savedTask.populate('volunteer', 'userId');
    await savedTask.populate('volunteer.userId', 'name email phone');

    // Step 2: ✅ Update volunteer's taskStatus to 1 (Assigned)
    volunteer.taskStatus = 1; // 0 → 1 (Available → Assigned)
    await volunteer.save();

    console.log('Task assigned:', {
      taskId: savedTask._id,
      taskType: savedTask.taskType,
      incident: savedTask.incident?.type,
      volunteer: savedTask.volunteer?.userId?.name
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      // Emit to specific volunteer room (using volunteer profile ID)
      io.to(`volunteer-${task.volunteer.toString()}`).emit('new-task-assigned', savedTask);
      // Also emit general event
      io.emit('task-assigned', savedTask);
      console.log(`Socket event "new-task-assigned" emitted to volunteer-${task.volunteer.toString()}`);
      console.log('Socket event "task-assigned" emitted (general)');
    }

    res.status(201).json({
      message: 'Task assigned successfully',
      task: savedTask
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Get volunteer profile by user ID
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const volunteer = await VolunteerProfile.findOne({ userId: req.params.userId })
      .populate('userId', 'name email phone role');

    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found' });
    }

    // Volunteers can only see their own profile
    if (req.user.role === 'volunteer' && req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(volunteer);
  } catch (error) {
    console.error('Error fetching volunteer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STEP 5: Volunteer views assigned tasks
router.get('/volunteer/:volunteerId', authMiddleware, async (req, res) => {
  try {
    const { volunteerId } = req.params;
    console.log(`GET /api/tasks/volunteer/${volunteerId} - Request received`);
    console.log('User:', { id: req.user._id, role: req.user.role });

    // Verify volunteer exists and user has access
    const volunteer = await VolunteerProfile.findById(volunteerId);
    if (!volunteer) {
      console.log(`GET /api/tasks/volunteer/${volunteerId} - Volunteer not found`);
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Volunteers can only see their own tasks
    if (req.user.role === 'volunteer' && volunteer.userId.toString() !== req.user._id.toString()) {
      console.log(`GET /api/tasks/volunteer/${volunteerId} - Access denied`);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find all tasks assigned to this volunteer
    const tasks = await Task.find({ volunteer: volunteerId })
      .sort({ createdAt: -1 })
      .populate('incident', 'location type severity description latitude longitude')
      .populate('assignedBy', 'name email');

    console.log(`GET /api/tasks/volunteer/${volunteerId} - Found ${tasks.length} tasks`);

    // Enhance tasks with incident details
    const enhancedTasks = tasks.map(task => {
      const taskObj = task.toObject ? task.toObject() : task;
      return {
        ...taskObj,
        incident: task.incident ? {
          _id: task.incident._id,
          location: task.incident.location,
          type: task.incident.type,
          severity: task.incident.severity,
          description: task.incident.description,
          latitude: task.incident.latitude,
          longitude: task.incident.longitude
        } : null
      };
    });

    console.log(`GET /api/tasks/volunteer/${volunteerId} - Returning ${enhancedTasks.length} enhanced tasks`);

    res.json(enhancedTasks);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// STEP 6: Volunteer accepts or rejects task
router.put('/update-status/:volunteerId/:taskId', authMiddleware, async (req, res) => {
  try {
    const { volunteerId, taskId } = req.params;
    const { status } = req.body; // 2 = Accept, 3 = Reject

    if (!status || (status !== 2 && status !== 3)) {
      return res.status(400).json({ message: 'Status must be 2 (Accept) or 3 (Reject)' });
    }

    // Verify volunteer exists and user has access
    const volunteer = await VolunteerProfile.findById(volunteerId);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Volunteers can only update their own tasks
    if (req.user.role === 'volunteer' && volunteer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.volunteer.toString() !== volunteerId) {
      return res.status(400).json({ message: 'Task is not assigned to this volunteer' });
    }

    // Update task status
    task.status = status; // 2 = Accepted, 3 = Rejected
    if (status === 2) {
      task.acceptedAt = new Date();
    }
    await task.save();

    // Update volunteer's taskStatus
    if (status === 2) {
      volunteer.taskStatus = 2; // ✅ 1 → 2 (Assigned → Accepted)
    } else if (status === 3) {
      volunteer.taskStatus = 0; // ✅ 1 → 0 (Assigned → Available, volunteer rejected)
    }
    await volunteer.save();

    console.log(`Task ${taskId} ${status === 2 ? 'accepted' : 'rejected'} by volunteer ${volunteerId}`);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('task-status-updated', task);
      console.log('Socket event "task-status-updated" emitted');
    }

    const statusText = status === 2 ? 'accepted' : 'rejected';
    res.json({
      message: `Task ${statusText} successfully`,
      task
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get accepted tasks for a volunteer
router.get('/volunteer/:volunteerId/accepted', authMiddleware, async (req, res) => {
  try {
    const { volunteerId } = req.params;

    const volunteer = await VolunteerProfile.findById(volunteerId);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Volunteers can only see their own tasks
    if (req.user.role === 'volunteer' && volunteer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({
      volunteer: volunteerId,
      status: 2 // Only accepted tasks
    })
      .sort({ createdAt: -1 })
      .populate('incident', 'location type severity description latitude longitude')
      .populate('assignedBy', 'name email');

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching accepted tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tasks (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({})
      .sort({ createdAt: -1 })
      .populate('incident', 'location type severity')
      .populate('volunteer', 'userId')
      .populate('volunteer.userId', 'name email phone')
      .populate('assignedBy', 'name email');

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
