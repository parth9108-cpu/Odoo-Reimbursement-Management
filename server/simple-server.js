const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenzo_mvp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ═══════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════

// Company Schema
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  currencyCode: { type: String, required: true, default: 'USD' },
  approvalSequences: [{
    name: String,
    role: String,           // legacy field
    department: String,     // e.g. 'finance'
    designation: String,    // e.g. 'director'
    matchType: { type: String, enum: ['manager', 'department', 'designation'], default: 'manager' },
    sequenceStep: Number
  }],
  conditionalRules: [{
    type: { type: String, enum: ['percentage', 'specific', 'hybrid'] },
    threshold: Number,
    approverDesignation: String,  // e.g. 'cfo'
    cfoOverride: { type: Boolean, default: false }
  }],
  departmentBudgets: [{
    department: String,
    monthlyLimit: Number
  }]
}, { timestamps: true });

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'employee'], required: true },
  department: { type: String, enum: ['engineering', 'finance', 'hr', 'marketing', 'operations', 'sales', 'general'], default: 'general' },
  designation: { type: String, enum: ['employee', 'manager', 'senior_manager', 'director', 'vp', 'cfo', 'ceo'], default: 'employee' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isManagerApprover: { type: Boolean, default: false },
  budgetLimit: { type: Number, default: 0 }, // 0 = no limit
  phone: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Expense Schema
const expenseSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  amountOriginal: { type: Number, required: true },
  currencyOriginal: { type: String, required: true },
  amountCompanyCurrency: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  receiptImagePath: { type: String, default: null },
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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    department: String,
    designation: String,
    sequenceStep: Number,
    decision: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: String,
    decidedAt: Date
  }],
  status: { type: String, enum: ['pending', 'in_progress', 'approved', 'rejected'], default: 'pending' },
  fraudFlags: [{
    type: { type: String },    // 'duplicate_receipt', 'over_budget', 'anomalous_amount'
    details: String,
    flaggedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// AuditLog Schema
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetType: { type: String, enum: ['expense', 'user', 'company', 'rule'] },
  details: { type: mongoose.Schema.Types.Mixed },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const Company = mongoose.model('Company', companySchema);
const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

// Audit log helper
async function logAudit(action, performedBy, targetId, targetType, details, previousValue, newValue) {
  try {
    await AuditLog.create({ action, performedBy, targetId, targetType, details, previousValue, newValue });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).populate('companyId');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get exchange rate
const getExchangeRate = async (from, to) => {
  if (from === to) return 1;
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, { timeout: 5000 });
    return response.data.rates[to] || 1;
  } catch (error) {
    console.error('Exchange rate error:', error.message);
    // Fallback rates
    const fallbackRates = { 'USD': { 'INR': 83 }, 'GBP': { 'INR': 105 }, 'EUR': { 'INR': 90 }, 'INR': { 'USD': 0.012 } };
    return fallbackRates[from]?.[to] || 1;
  }
};

// Build approval chain dynamically for an expense
async function buildApprovalChain(employee, company) {
  const approvers = [];
  let step = 1;

  for (const seq of company.approvalSequences) {
    let approverUser = null;

    if (seq.matchType === 'manager') {
      // Step 1: Employee's reporting manager
      if (employee.managerId) {
        approverUser = await User.findById(employee.managerId);
      }
    } else if (seq.matchType === 'department') {
      // Find a user in the specified department with manager role
      approverUser = await User.findOne({
        companyId: company._id,
        department: seq.department,
        role: 'manager',
        isActive: true,
        _id: { $ne: employee._id }
      });
    } else if (seq.matchType === 'designation') {
      // Find a user with the specified designation
      approverUser = await User.findOne({
        companyId: company._id,
        designation: seq.designation,
        isActive: true,
        _id: { $ne: employee._id }
      });
    }

    if (approverUser) {
      // Avoid duplicate approvers
      const alreadyAdded = approvers.some(a => a.userId.toString() === approverUser._id.toString());
      if (!alreadyAdded) {
        approvers.push({
          userId: approverUser._id,
          role: approverUser.role,
          department: approverUser.department,
          designation: approverUser.designation,
          sequenceStep: step++,
          decision: 'pending'
        });
      }
    }
  }

  return approvers;
}

// Check conditional rules and maybe auto-approve
function checkConditionalRules(expense, company, currentApprover) {
  for (const rule of company.conditionalRules || []) {
    if (rule.type === 'percentage') {
      const approvedCount = expense.approvers.filter(a => a.decision === 'approved').length;
      const totalApprovers = expense.approvers.length;
      if (totalApprovers > 0 && (approvedCount / totalApprovers) >= rule.threshold) {
        return { autoApprove: true, reason: `${Math.round(rule.threshold * 100)}% approval threshold met` };
      }
    }

    if (rule.type === 'specific' || rule.cfoOverride) {
      const targetDesignation = rule.approverDesignation || 'cfo';
      if (currentApprover && currentApprover.designation === targetDesignation) {
        return { autoApprove: true, reason: `${targetDesignation.toUpperCase()} override - auto approved` };
      }
    }

    if (rule.type === 'hybrid') {
      // Check percentage OR specific approver
      const approvedCount = expense.approvers.filter(a => a.decision === 'approved').length;
      const totalApprovers = expense.approvers.length;
      const percentageMet = totalApprovers > 0 && (approvedCount / totalApprovers) >= (rule.threshold || 0.6);
      const targetDesignation = rule.approverDesignation || 'cfo';
      const specificMet = currentApprover && currentApprover.designation === targetDesignation;

      if (percentageMet || specificMet) {
        return { autoApprove: true, reason: 'Hybrid rule met (percentage or specific approver)' };
      }
    }
  }
  return { autoApprove: false };
}

// Fraud detection helpers
async function checkForFraud(expense, companyId, employeeId) {
  const flags = [];

  // 1. Duplicate receipt: same merchant + amount within 2 days
  if (expense.extractedFields?.merchant) {
    const twoDaysAgo = new Date(expense.date);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysLater = new Date(expense.date);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);

    const duplicate = await Expense.findOne({
      _id: { $ne: expense._id },
      companyId,
      employeeId,
      amountOriginal: expense.amountOriginal,
      'extractedFields.merchant': expense.extractedFields.merchant,
      date: { $gte: twoDaysAgo, $lte: twoDaysLater }
    });

    if (duplicate) {
      flags.push({
        type: 'duplicate_receipt',
        details: `Possible duplicate: Same merchant "${expense.extractedFields.merchant}" and amount ${expense.amountOriginal} found within 2 days (ID: ${duplicate._id})`
      });
    }
  }

  // 2. Budget exceeded
  const employee = await User.findById(employeeId);
  if (employee && employee.budgetLimit > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySpend = await Expense.aggregate([
      {
        $match: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          status: { $ne: 'rejected' },
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amountCompanyCurrency' } } }
    ]);

    const currentSpend = (monthlySpend[0]?.total || 0) + expense.amountCompanyCurrency;
    if (currentSpend > employee.budgetLimit) {
      flags.push({
        type: 'over_budget',
        details: `Monthly spend ${currentSpend} exceeds budget limit ${employee.budgetLimit}`
      });
    }
  }

  // 3. Anomalous amount (> 3σ from employee's mean)
  const stats = await Expense.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        companyId: new mongoose.Types.ObjectId(companyId)
      }
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$amountCompanyCurrency' },
        stdDev: { $stdDevPop: '$amountCompanyCurrency' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (stats[0] && stats[0].count > 3) {
    const threshold = stats[0].avg + (3 * stats[0].stdDev);
    if (expense.amountCompanyCurrency > threshold) {
      flags.push({
        type: 'anomalous_amount',
        details: `Amount ${expense.amountCompanyCurrency} is unusually high (avg: ${Math.round(stats[0].avg)}, threshold: ${Math.round(threshold)})`
      });
    }
  }

  return flags;
}


// ═══════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// ─── AUTH ROUTES ───

// Countries
app.get('/api/auth/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies', { timeout: 5000 });
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2,
      currency: Object.keys(country.currencies || {})[0] || 'USD'
    }));
    res.json(countries);
  } catch (error) {
    const fallbackCountries = [
      { name: 'India', code: 'IN', currency: 'INR' },
      { name: 'United States', code: 'US', currency: 'USD' },
      { name: 'United Kingdom', code: 'GB', currency: 'GBP' },
      { name: 'Canada', code: 'CA', currency: 'CAD' },
      { name: 'Australia', code: 'AU', currency: 'AUD' }
    ];
    res.json(fallbackCountries);
  }
});

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, country, companyName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let currencyCode = 'USD';
    try {
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies', { timeout: 3000 });
      const countryData = response.data.find(c => c.name.common === country);
      currencyCode = countryData ? Object.keys(countryData.currencies || {})[0] : 'USD';
    } catch {
      const currencyMap = { 'India': 'INR', 'United States': 'USD', 'United Kingdom': 'GBP' };
      currencyCode = currencyMap[country] || 'USD';
    }

    // Create company with default approval flow
    const company = new Company({
      name: companyName,
      country,
      currencyCode,
      approvalSequences: [
        { name: 'Reporting Manager', matchType: 'manager', sequenceStep: 1 },
        { name: 'Finance Department', matchType: 'department', department: 'finance', sequenceStep: 2 },
        { name: 'Director', matchType: 'designation', designation: 'director', sequenceStep: 3 }
      ],
      conditionalRules: [
        { type: 'percentage', threshold: 0.6 },
        { type: 'specific', approverDesignation: 'cfo', cfoOverride: true }
      ]
    });
    await company.save();

    const user = new User({
      name, email, passwordHash: password,
      role: 'admin',
      department: 'general',
      designation: 'ceo',
      companyId: company._id
    });
    await user.save();

    await logAudit('company_created', user._id, company._id, 'company', { companyName });
    await logAudit('user_created', user._id, user._id, 'user', { email, role: 'admin' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '8h' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, designation: user.designation, companyId: user.companyId }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('companyId');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '8h' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department, designation: user.designation, companyId: user.companyId }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', auth, async (req, res) => {
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, department: req.user.department, designation: req.user.designation, companyId: req.user.companyId }
  });
});

// ─── USER MANAGEMENT ROUTES (Admin) ───

// Get all users in company
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId })
      .select('-passwordHash')
      .populate('managerId', 'name email role department designation');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get managers list (for dropdowns)
app.get('/api/users/managers', auth, async (req, res) => {
  try {
    const managers = await User.find({
      companyId: req.user.companyId,
      role: 'manager',
      isActive: true
    }).select('name email department designation');
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch managers' });
  }
});

// Create user (Admin only)
app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department, designation, managerId, isManagerApprover, budgetLimit, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({
      name, email,
      passwordHash: password || 'password123',
      role: role || 'employee',
      department: department || 'general',
      designation: designation || 'employee',
      companyId: req.user.companyId,
      managerId: managerId || null,
      isManagerApprover: isManagerApprover || false,
      budgetLimit: budgetLimit || 0,
      phone: phone || ''
    });
    await user.save();

    await logAudit('user_created', req.user._id, user._id, 'user', { name, email, role, department, designation });

    const savedUser = await User.findById(user._id)
      .select('-passwordHash')
      .populate('managerId', 'name email');

    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
});

// Update user (Admin only)
app.put('/api/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, role, department, designation, managerId, isManagerApprover, budgetLimit, phone, isActive } = req.body;

    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousValue = { role: user.role, department: user.department, designation: user.designation, managerId: user.managerId };

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (designation !== undefined) user.designation = designation;
    if (managerId !== undefined) user.managerId = managerId || null;
    if (isManagerApprover !== undefined) user.isManagerApprover = isManagerApprover;
    if (budgetLimit !== undefined) user.budgetLimit = budgetLimit;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    await logAudit('user_updated', req.user._id, user._id, 'user', { changes: req.body }, previousValue, req.body);

    const updatedUser = await User.findById(user._id)
      .select('-passwordHash')
      .populate('managerId', 'name email');

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    // Unassign this user as manager from employees
    await User.updateMany({ managerId: user._id }, { $set: { managerId: null } });

    await user.deleteOne();
    await logAudit('user_deleted', req.user._id, user._id, 'user', { name: user.name, email: user.email });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ─── COMPANY / APPROVAL RULES ROUTES ───

// Get company approval rules
app.get('/api/company/approval-rules', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json({
      approvalSequences: company.approvalSequences,
      conditionalRules: company.conditionalRules,
      departmentBudgets: company.departmentBudgets
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch approval rules' });
  }
});

// Update company approval rules (Admin only)
app.put('/api/company/approval-rules', auth, adminOnly, async (req, res) => {
  try {
    const { approvalSequences, conditionalRules } = req.body;
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const previousValue = { approvalSequences: company.approvalSequences, conditionalRules: company.conditionalRules };

    if (approvalSequences) company.approvalSequences = approvalSequences;
    if (conditionalRules) company.conditionalRules = conditionalRules;

    await company.save();

    await logAudit('approval_rules_updated', req.user._id, company._id, 'company', { changes: req.body }, previousValue, req.body);

    res.json({
      approvalSequences: company.approvalSequences,
      conditionalRules: company.conditionalRules
    });
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ message: 'Failed to update approval rules' });
  }
});

// Update budget limits (Admin only)
app.put('/api/company/budget', auth, adminOnly, async (req, res) => {
  try {
    const { departmentBudgets } = req.body;
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.departmentBudgets = departmentBudgets;
    await company.save();

    await logAudit('budget_updated', req.user._id, company._id, 'company', { departmentBudgets });

    res.json({ departmentBudgets: company.departmentBudgets });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update budgets' });
  }
});

// ─── EXPENSE ROUTES ───

// Create expense
app.post('/api/expenses', auth, async (req, res) => {
  try {
    const { amountOriginal, currencyOriginal, category, description, date, receiptImagePath, extractedFields } = req.body;

    const company = await Company.findById(req.user.companyId);
    const exchangeRate = await getExchangeRate(currencyOriginal, company.currencyCode);
    const amountCompanyCurrency = amountOriginal * exchangeRate;

    // Build approval chain dynamically
    const approvers = await buildApprovalChain(req.user, company);

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
      approvers,
      status: approvers.length > 0 ? 'pending' : 'approved' // Auto-approve if no approvers
    });

    // Run fraud checks
    const fraudFlags = await checkForFraud(expense, req.user.companyId, req.user._id);
    if (fraudFlags.length > 0) {
      expense.fraudFlags = fraudFlags;
    }

    await expense.save();
    await expense.populate('employeeId', 'name email');

    await logAudit('expense_created', req.user._id, expense._id, 'expense', {
      amount: amountOriginal, currency: currencyOriginal, category, description
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// Get fraud-flagged expenses (admin only)
app.get('/api/expenses/fraud-check', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const flaggedExpenses = await Expense.find({
      companyId: req.user.companyId,
      'fraudFlags.0': { $exists: true }  // Has at least one fraud flag
    })
      .populate('employeeId', 'name email department designation')
      .populate('approvers.userId', 'name email role department designation')
      .sort({ createdAt: -1 });

    res.json(flaggedExpenses);
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({ message: 'Failed to fetch fraud alerts' });
  }
});

// Get expenses (role-filtered)
app.get('/api/expenses', auth, async (req, res) => {
  try {
    let query = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      // Manager sees: own team + expenses pending their approval
      const teamMembers = await User.find({
        companyId: req.user.companyId,
        managerId: req.user._id
      });
      const teamMemberIds = teamMembers.map(m => m._id);

      query.$or = [
        { employeeId: { $in: teamMemberIds } },
        { 'approvers.userId': req.user._id }
      ];
    }
    // Admin sees all (no filter)

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email department designation')
      .populate('approvers.userId', 'name email role department designation')
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Approve/Reject expense — SEQUENTIAL ENFORCEMENT
app.post('/api/expenses/:id/approve', auth, async (req, res) => {
  try {
    const { decision, comment } = req.body;
    const expense = await Expense.findById(req.params.id).populate('companyId');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Find the CURRENT step (lowest sequenceStep with pending decision)
    const pendingApprovers = expense.approvers
      .filter(a => a.decision === 'pending')
      .sort((a, b) => a.sequenceStep - b.sequenceStep);

    if (pendingApprovers.length === 0) {
      return res.status(400).json({ message: 'No pending approvals for this expense' });
    }

    const currentStep = pendingApprovers[0];

    // Check if the current user is the approver for this step
    if (currentStep.userId.toString() !== req.user._id.toString()) {
      // Allow admin override
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: `Not your turn. Waiting for Step ${currentStep.sequenceStep} approval.`
        });
      }
    }

    // Find and update the approver record
    const approverIndex = expense.approvers.findIndex(
      a => a.userId.toString() === (req.user.role === 'admin' ? currentStep.userId.toString() : req.user._id.toString())
        && a.decision === 'pending'
    );

    if (approverIndex === -1) {
      return res.status(403).json({ message: 'Not authorized to approve this expense' });
    }

    expense.approvers[approverIndex].decision = decision;
    expense.approvers[approverIndex].comment = comment || '';
    expense.approvers[approverIndex].decidedAt = new Date();

    if (decision === 'rejected') {
      // Rejection STOPS the chain
      expense.status = 'rejected';
    } else if (decision === 'approved') {
      // Check conditional rules for possible auto-approve
      const currentApproverUser = await User.findById(currentStep.userId);
      const conditionalResult = checkConditionalRules(expense, expense.companyId, currentApproverUser);

      if (conditionalResult.autoApprove) {
        // Auto-approve: mark all remaining pending as approved
        expense.approvers.forEach((a, i) => {
          if (a.decision === 'pending') {
            expense.approvers[i].decision = 'approved';
            expense.approvers[i].comment = conditionalResult.reason;
            expense.approvers[i].decidedAt = new Date();
          }
        });
        expense.status = 'approved';
      } else {
        // Check if more pending approvers remain
        const hasMore = expense.approvers.some(a => a.decision === 'pending');
        if (hasMore) {
          expense.status = 'in_progress'; // Partially approved
        } else {
          expense.status = 'approved'; // All approved
        }
      }
    }

    await expense.save();

    await logAudit(
      decision === 'approved' ? 'expense_approved' : 'expense_rejected',
      req.user._id, expense._id, 'expense',
      { decision, comment, step: currentStep.sequenceStep, status: expense.status }
    );

    // Re-populate for response
    await expense.populate('employeeId', 'name email');
    await expense.populate('approvers.userId', 'name email role department designation');

    res.json(expense);
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Failed to process approval' });
  }
});

// ─── FRAUD CHECK ROUTE ───

app.get('/api/expenses/fraud-check', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const flaggedExpenses = await Expense.find({
      companyId: req.user.companyId,
      'fraudFlags.0': { $exists: true }
    })
    .populate('employeeId', 'name email department')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(flaggedExpenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fraud alerts' });
  }
});

// ─── AUDIT LOG ROUTES ───

app.get('/api/audit-logs', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { page = 1, limit = 50, action } = req.query;
    const query = {};

    // Only show logs from users in same company
    const companyUsers = await User.find({ companyId: req.user.companyId }).select('_id');
    const userIds = companyUsers.map(u => u._id);
    query.performedBy = { $in: userIds };

    if (action) {
      query.action = action;
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// ─── DASHBOARD STATS ───

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (req.user.role === 'admin') {
      const totalUsers = await User.countDocuments({ companyId, isActive: true });
      const totalExpenses = await Expense.countDocuments({ companyId });
      const pendingApprovals = await Expense.countDocuments({ companyId, status: { $in: ['pending', 'in_progress'] } });
      const fraudAlerts = await Expense.countDocuments({ companyId, 'fraudFlags.0': { $exists: true } });

      const monthlySpendResult = await Expense.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId), createdAt: { $gte: startOfMonth }, status: { $ne: 'rejected' } } },
        { $group: { _id: null, total: { $sum: '$amountCompanyCurrency' } } }
      ]);

      const recentLogs = await AuditLog.find({})
        .populate('performedBy', 'name role')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        totalUsers, totalExpenses, pendingApprovals, fraudAlerts,
        monthlySpend: monthlySpendResult[0]?.total || 0,
        recentLogs
      });
    } else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId, managerId: req.user._id });
      const teamIds = teamMembers.map(m => m._id);

      const pendingApprovals = await Expense.countDocuments({
        companyId,
        status: { $in: ['pending', 'in_progress'] },
        'approvers.userId': req.user._id,
        'approvers.decision': 'pending'
      });

      const teamSpendResult = await Expense.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId), employeeId: { $in: teamIds }, createdAt: { $gte: startOfMonth }, status: { $ne: 'rejected' } } },
        { $group: { _id: null, total: { $sum: '$amountCompanyCurrency' } } }
      ]);

      res.json({
        teamSize: teamMembers.length,
        pendingApprovals,
        teamSpend: teamSpendResult[0]?.total || 0
      });
    } else {
      // Employee
      const myExpenses = await Expense.countDocuments({ employeeId: req.user._id });
      const pending = await Expense.countDocuments({ employeeId: req.user._id, status: { $in: ['pending', 'in_progress'] } });
      const approved = await Expense.countDocuments({ employeeId: req.user._id, status: 'approved' });
      const rejected = await Expense.countDocuments({ employeeId: req.user._id, status: 'rejected' });

      const mySpendResult = await Expense.aggregate([
        { $match: { employeeId: req.user._id, createdAt: { $gte: startOfMonth }, status: { $ne: 'rejected' } } },
        { $group: { _id: null, total: { $sum: '$amountCompanyCurrency' } } }
      ]);

      res.json({
        totalExpenses: myExpenses, pending, approved, rejected,
        monthlySpend: mySpendResult[0]?.total || 0,
        budgetLimit: req.user.budgetLimit
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// ─── EXCHANGE RATES ───

app.get('/api/exchange', async (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${base}`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

// ─── ANALYTICS ENDPOINTS ───

app.get('/api/analytics/kpis', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    const totalSpend = expenses.reduce((sum, exp) => sum + exp.amountCompanyCurrency, 0);
    const pendingApprovals = expenses.filter(exp => exp.status === 'pending' || exp.status === 'in_progress').length;

    const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
    const avgApprovalTime = approvedExpenses.length > 0
      ? approvedExpenses.reduce((sum, exp) => {
          const approvalTime = exp.approvers.find(a => a.decision === 'approved')?.decidedAt;
          return approvalTime ? sum + (approvalTime - exp.createdAt) / (1000 * 60 * 60) : sum;
        }, 0) / approvedExpenses.length
      : 0;

    res.json({
      totalSpend, pendingApprovals, totalExpenses: expenses.length,
      avgApprovalTime: Math.round(avgApprovalTime * 10) / 10,
      approvedCount: approvedExpenses.length,
      rejectedCount: expenses.filter(e => e.status === 'rejected').length,
      inProgressCount: expenses.filter(e => e.status === 'in_progress').length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch KPIs' });
  }
});

app.get('/api/analytics/timeseries', auth, async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query).sort({ createdAt: 1 });
    const grouped = {};
    expenses.forEach(expense => {
      const date = new Date(expense.createdAt);
      let key;
      if (groupBy === 'day') key = date.toISOString().split('T')[0];
      else if (groupBy === 'week') { const ws = new Date(date); ws.setDate(date.getDate() - date.getDay()); key = ws.toISOString().split('T')[0]; }
      else key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[key]) grouped[key] = { total: 0, count: 0, categories: {} };
      grouped[key].total += expense.amountCompanyCurrency;
      grouped[key].count += 1;
      if (!grouped[key].categories[expense.category]) grouped[key].categories[expense.category] = 0;
      grouped[key].categories[expense.category] += expense.amountCompanyCurrency;
    });

    const timeseries = Object.entries(grouped).map(([date, data]) => ({ date, total: data.total, count: data.count, categories: data.categories })).sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(timeseries);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch timeseries data' }); }
});

app.get('/api/analytics/categories', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    const categoryData = {};
    expenses.forEach(exp => {
      if (!categoryData[exp.category]) categoryData[exp.category] = { total: 0, count: 0 };
      categoryData[exp.category].total += exp.amountCompanyCurrency;
      categoryData[exp.category].count += 1;
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amountCompanyCurrency, 0);
    const categories = Object.entries(categoryData).map(([category, data]) => ({
      category, total: data.total, count: data.count,
      percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    res.json(categories);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch category data' }); }
});

app.get('/api/analytics/top-merchants', auth, async (req, res) => {
  try {
    const { from, to, limit = 20 } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    const merchantData = {};
    expenses.forEach(exp => {
      const merchant = exp.extractedFields?.merchant || 'Unknown';
      if (!merchantData[merchant]) merchantData[merchant] = { total: 0, count: 0, receipts: [] };
      merchantData[merchant].total += exp.amountCompanyCurrency;
      merchantData[merchant].count += 1;
      merchantData[merchant].receipts.push({ id: exp._id, amount: exp.amountCompanyCurrency, date: exp.createdAt, confidence: exp.extractedFields?.confidences?.merchant || 0 });
    });

    const merchants = Object.entries(merchantData).map(([merchant, data]) => ({
      merchant, total: data.total, count: data.count, avgReceipt: data.total / data.count, receipts: data.receipts
    })).sort((a, b) => b.total - a.total).slice(0, parseInt(limit));

    res.json(merchants);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch merchant data' }); }
});

app.get('/api/analytics/approval-funnel', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    const funnel = {
      submitted: expenses.length,
      inProgress: expenses.filter(e => e.status === 'in_progress').length,
      managerApproved: expenses.filter(e => e.approvers.some(a => a.role === 'manager' && a.decision === 'approved')).length,
      financeApproved: expenses.filter(e => e.approvers.some(a => a.department === 'finance' && a.decision === 'approved')).length,
      finalApproved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length
    };
    res.json(funnel);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch approval funnel data' }); }
});

app.get('/api/analytics/ocr-confidence', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate }, extractedFields: { $exists: true } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    const confidenceData = expenses.map(exp => {
      const confidences = exp.extractedFields?.confidences || {};
      const values = Object.values(confidences);
      const avgConfidence = values.length > 0 ? values.reduce((s, c) => s + c, 0) / values.length : 0;
      return { id: exp._id, avgConfidence, merchant: exp.extractedFields?.merchant, amount: exp.amountCompanyCurrency, date: exp.createdAt };
    });
    res.json(confidenceData);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch OCR confidence data' }); }
});

app.get('/api/analytics/outliers', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    let query = { companyId: req.user.companyId, createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query);
    if (expenses.length === 0) return res.json([]);

    const amounts = expenses.map(e => e.amountCompanyCurrency);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const outliers = expenses.filter(e => e.amountCompanyCurrency > mean + 3 * stdDev).map(e => ({
      id: e._id, amount: e.amountCompanyCurrency, description: e.description, employee: e.employeeId, date: e.createdAt, category: e.category, merchant: e.extractedFields?.merchant
    }));
    res.json(outliers);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch outlier data' }); }
});

app.post('/api/analytics/export', auth, async (req, res) => {
  try {
    const { format = 'csv', from, to } = req.body;
    let query = { companyId: req.user.companyId };
    if (from && to) query.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    if (req.user.role === 'employee') query.employeeId = req.user._id;
    else if (req.user.role === 'manager') {
      const teamMembers = await User.find({ companyId: req.user.companyId, managerId: req.user._id });
      query.employeeId = { $in: teamMembers.map(m => m._id) };
    }

    const expenses = await Expense.find(query).populate('employeeId', 'name email').sort({ createdAt: -1 });

    if (format === 'csv') {
      const csvData = expenses.map(e => ({
        Date: e.createdAt.toISOString().split('T')[0], Employee: e.employeeId.name,
        Amount: e.amountCompanyCurrency, Currency: e.currencyOriginal,
        Category: e.category, Description: e.description, Status: e.status,
        Merchant: e.extractedFields?.merchant || ''
      }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
      const csv = [Object.keys(csvData[0] || {}).join(','), ...csvData.map(r => Object.values(r).join(','))].join('\n');
      res.send(csv);
    } else {
      res.json(expenses);
    }
  } catch (error) { res.status(500).json({ message: 'Failed to export data' }); }
});

// ═══════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
