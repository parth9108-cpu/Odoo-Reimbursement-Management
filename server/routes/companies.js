const express = require('express');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get company by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load company' });
  }
});

module.exports = router;
