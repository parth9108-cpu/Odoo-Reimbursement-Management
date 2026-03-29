const express = require('express');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId })
      .select('-passwordHash')
      .populate('managerId', 'name email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create user (admin only)
router.post('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, managerId, isManagerApprover } = req.body;

    const user = new User({
      name,
      email,
      passwordHash: password,
      role,
      companyId: req.user.companyId,
      managerId: managerId || null,
      isManagerApprover: isManagerApprover || false
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId,
      isManagerApprover: user.isManagerApprover
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
});

module.exports = router;

