const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true
  },
  currencyCode: {
    type: String,
    required: true,
    default: 'INR'
  },
  approvalSequences: [{
    name: String,
    role: String,
    sequenceStep: Number
  }],
  conditionalRules: [{
    type: {
      type: String,
      enum: ['percentage', 'specific']
    },
    threshold: Number, // for percentage rule
    approverRole: String // for specific rule
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);

