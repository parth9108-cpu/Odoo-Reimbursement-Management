const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Get countries for signup
router.get('/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2,
      currency: Object.keys(country.currencies || {})[0] || 'USD'
    }));
    res.json(countries);
  } catch (error) {
    console.error('Countries API error:', error.message);
    // Fallback countries list
    const fallbackCountries = [
      { name: 'India', code: 'IN', currency: 'INR' },
      { name: 'United States', code: 'US', currency: 'USD' },
      { name: 'United Kingdom', code: 'GB', currency: 'GBP' },
      { name: 'Canada', code: 'CA', currency: 'CAD' },
      { name: 'Australia', code: 'AU', currency: 'AUD' },
      { name: 'Germany', code: 'DE', currency: 'EUR' },
      { name: 'France', code: 'FR', currency: 'EUR' },
      { name: 'Japan', code: 'JP', currency: 'JPY' },
      { name: 'Singapore', code: 'SG', currency: 'SGD' },
      { name: 'United Arab Emirates', code: 'AE', currency: 'AED' }
    ];
    res.json(fallbackCountries);
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, country, companyName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Get currency for country
    let currencyCode = 'USD'; // Default fallback
    try {
      const countriesResponse = await axios.get('https://restcountries.com/v3.1/all', {
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const countryData = countriesResponse.data.find(c => c.name.common === country);
      currencyCode = countryData ? Object.keys(countryData.currencies || {})[0] : 'USD';
    } catch (error) {
      console.error('Country API error during signup:', error.message);
      // Use fallback currency mapping
      const currencyMap = {
        'India': 'INR',
        'United States': 'USD',
        'United Kingdom': 'GBP',
        'Canada': 'CAD',
        'Australia': 'AUD',
        'Germany': 'EUR',
        'France': 'EUR',
        'Japan': 'JPY',
        'Singapore': 'SGD',
        'United Arab Emirates': 'AED'
      };
      currencyCode = currencyMap[country] || 'USD';
    }

    // Create or find company
    let company;
    if (role === 'admin') {
      company = new Company({
        name: companyName,
        country,
        currencyCode,
        approvalSequences: [
          { name: 'Manager', role: 'manager', sequenceStep: 1 },
          { name: 'Finance', role: 'finance', sequenceStep: 2 }
        ],
        conditionalRules: [
          { type: 'percentage', threshold: 0.6 }
        ]
      });
      await company.save();
    } else {
      // For non-admin users, they need to be invited to an existing company
      return res.status(400).json({ message: 'Only admin users can sign up directly' });
    }

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      role,
      companyId: company._id
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('companyId');
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful for:', email);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      companyId: req.user.companyId
    }
  });
});

module.exports = router;
