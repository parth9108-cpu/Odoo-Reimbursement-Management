const express = require('express');
const Expense = require('../models/Expense');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');

const router = express.Router();

// KPIs
router.get('/kpis', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const [totalSpend, pendingApprovals, avgApprovalTime, autoApproved] = await Promise.all([
      Expense.aggregate([
        { $match: { companyId } },
        { $group: { _id: null, total: { $sum: '$amountCompanyCurrency' } } }
      ]),
      Expense.countDocuments({ companyId, status: 'pending' }),
      Expense.aggregate([
        { $match: { companyId, status: 'approved' } },
        { $project: { diff: { $subtract: ['$updatedAt', '$createdAt'] } } },
        { $group: { _id: null, avg: { $avg: '$diff' } } }
      ]),
      Expense.countDocuments({ companyId, 'approvers.0.role': 'auto', status: 'approved' })
    ]);
    res.json({
      totalSpend: totalSpend[0]?.total || 0,
      pendingApprovals,
      avgApprovalTime: avgApprovalTime[0]?.avg || 0,
      autoApprovedPercentage: autoApproved ? Math.round((autoApproved / Math.max(1, pendingApprovals + autoApproved)) * 100) : 0
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load KPIs' });
  }
});

// Time Series
router.get('/timeseries', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const data = await Expense.aggregate([
      { $match: { companyId } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amountCompanyCurrency' }
      } },
      { $sort: { _id: 1 } }
    ]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load time series' });
  }
});

// Category Donut
router.get('/categories', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const data = await Expense.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$category', total: { $sum: '$amountCompanyCurrency' } } },
      { $sort: { total: -1 } }
    ]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

// Top Merchants
router.get('/merchants', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const data = await Expense.aggregate([
      { $match: { companyId, 'extractedFields.merchant': { $exists: true, $ne: null } } },
      { $group: { _id: '$extractedFields.merchant', total: { $sum: '$amountCompanyCurrency' } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load merchants' });
  }
});

// Approval Funnel
router.get('/approval-funnel', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const company = await Company.findById(companyId);
    const funnel = company.approvalSequences || [];
    res.json(funnel);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load approval funnel' });
  }
});

module.exports = router;
