const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Get exchange rate
const getExchangeRate = async (from, to) => {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
    return response.data.rates[to] || 1;
  } catch (error) {
    return 1; // Fallback to 1:1
  }
};

// Create expense
router.post('/', auth, async (req, res) => {
  try {
    const { amountOriginal, currencyOriginal, category, description, date, receiptImagePath, extractedFields } = req.body;

    // Get company currency
    const company = await Company.findById(req.user.companyId);
    const exchangeRate = await getExchangeRate(currencyOriginal, company.currencyCode);
    const amountCompanyCurrency = amountOriginal * exchangeRate;

    // Create approver queue
    const approvers = [];
    let sequenceStep = 1;

    // Add manager if they have approval rights
    if (req.user.managerId) {
      const manager = await User.findById(req.user.managerId);
      if (manager && manager.isManagerApprover) {
        approvers.push({
          userId: manager._id,
          role: 'manager',
          sequenceStep: sequenceStep++,
          decision: 'pending'
        });
      }
    }

    // Add company-defined approval sequence
    for (const sequence of company.approvalSequences) {
      const approver = await User.findOne({ 
        companyId: req.user.companyId, 
        role: sequence.role 
      });
      if (approver) {
        approvers.push({
          userId: approver._id,
          role: sequence.role,
          sequenceStep: sequenceStep++,
          decision: 'pending'
        });
      }
    }

    const expense = new Expense({
      employeeId: req.user._id,
      companyId: req.user.companyId,
      amountOriginal,
      currencyOriginal,
      amountCompanyCurrency,
      category,
      description,
      date: new Date(date),
      receiptImagePath,
      extractedFields,
      approvers
    });

    await expense.save();
    await expense.populate('employeeId', 'name email');

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// Get expenses
router.get('/', auth, async (req, res) => {
  try {
    let query = { companyId: req.user.companyId };

    // Filter based on role
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      // Manager sees their team's expenses and pending approvals
      const teamMembers = await User.find({ 
        companyId: req.user.companyId, 
        managerId: req.user._id 
      });
      const teamMemberIds = teamMembers.map(member => member._id);
      
      query.$or = [
        { employeeId: { $in: teamMemberIds } },
        { 'approvers.userId': req.user._id, 'approvers.decision': 'pending' }
      ];
    }
    // Admin sees all expenses

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email')
      .populate('approvers.userId', 'name email role')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get single expense
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('employeeId', 'name email')
      .populate('approvers.userId', 'name email role');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check access
    if (req.user.role === 'employee' && expense.employeeId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

// Approve/Reject expense
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { decision, comment } = req.body;
    const expense = await Expense.findById(req.params.id).populate('companyId');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Find current approver
    const approverIndex = expense.approvers.findIndex(
      approver => approver.userId.toString() === req.user._id.toString() && 
                  approver.decision === 'pending'
    );

    if (approverIndex === -1) {
      return res.status(403).json({ message: 'Not authorized to approve this expense' });
    }

    // Update approver decision
    expense.approvers[approverIndex].decision = decision;
    expense.approvers[approverIndex].comment = comment;
    expense.approvers[approverIndex].decidedAt = new Date();

    // Check conditional rules
    const company = expense.companyId;
    let shouldAutoApprove = false;

    for (const rule of company.conditionalRules) {
      if (rule.type === 'percentage') {
        const approvedCount = expense.approvers.filter(a => a.decision === 'approved').length;
        const totalApprovers = expense.approvers.length;
        if (approvedCount / totalApprovers >= rule.threshold) {
          shouldAutoApprove = true;
          break;
        }
      } else if (rule.type === 'specific') {
        const specificApprover = expense.approvers.find(
          a => a.role === rule.approverRole && a.decision === 'approved'
        );
        if (specificApprover) {
          shouldAutoApprove = true;
          break;
        }
      }
    }

    if (decision === 'rejected') {
      expense.status = 'rejected';
    } else if (shouldAutoApprove) {
      expense.status = 'approved';
    } else {
      // Check if there are more approvers
      const hasMoreApprovers = expense.approvers.some(a => a.decision === 'pending');
      if (!hasMoreApprovers) {
        expense.status = 'approved';
      }
    }

    await expense.save();
    res.json(expense);
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Failed to process approval' });
  }
});

module.exports = router;

