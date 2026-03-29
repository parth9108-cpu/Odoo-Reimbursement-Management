const express = require('express');
const axios = require('axios');

const router = express.Router();

// Get countries
router.get('/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all');
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2,
      currency: Object.keys(country.currencies || {})[0] || 'USD'
    }));
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch countries' });
  }
});

// Get exchange rates
router.get('/exchange', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${base}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

module.exports = router;

