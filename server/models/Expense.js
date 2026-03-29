const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amountOriginal: {
    type: Number,
    required: true
  },
  currencyOriginal: {
    type: String,
    required: true
  },
  amountCompanyCurrency: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  receiptImagePath: {
    type: String,
    default: null
  },
  extractedFields: {
    merchant: String,
    date: String,
    amount: String,
    taxLines: [String],
    confidences: {
      merchant: Number,
      amount: Number,
      date: Number
    }
  },
  approvers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    sequenceStep: Number,
    decision: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comment: String,
    decidedAt: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);

