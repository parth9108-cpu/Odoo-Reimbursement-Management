const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenzo_mvp');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // Clear all collections
  const collections = ['users', 'companies', 'expenses', 'auditlogs'];
  for (const col of collections) {
    try { await db.collection(col).drop(); } catch (e) {}
  }
  console.log('✅ Cleared existing data');

  // ─── COMPANY ───
  const companyId = new mongoose.Types.ObjectId();
  await db.collection('companies').insertOne({
    _id: companyId,
    name: 'TechNova Solutions Pvt Ltd',
    country: 'India',
    currencyCode: 'INR',
    approvalSequences: [
      { name: 'Reporting Manager', matchType: 'manager', department: '', designation: '', sequenceStep: 1 },
      { name: 'Finance Department', matchType: 'department', department: 'finance', designation: '', sequenceStep: 2 },
      { name: 'Director', matchType: 'designation', department: '', designation: 'director', sequenceStep: 3 }
    ],
    conditionalRules: [
      { type: 'percentage', threshold: 0.6, approverDesignation: '', cfoOverride: false },
      { type: 'specific', threshold: 0, approverDesignation: 'cfo', cfoOverride: true }
    ],
    departmentBudgets: [
      { department: 'engineering', monthlyLimit: 500000 },
      { department: 'marketing', monthlyLimit: 300000 },
      { department: 'sales', monthlyLimit: 400000 }
    ],
    createdAt: new Date(), updatedAt: new Date()
  });
  console.log('✅ Created company: TechNova Solutions');

  // ─── USERS ───
  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminId = new mongoose.Types.ObjectId();
  const managerId = new mongoose.Types.ObjectId();
  const employeeId = new mongoose.Types.ObjectId();
  const financeManagerId = new mongoose.Types.ObjectId();
  const directorId = new mongoose.Types.ObjectId();
  const cfoId = new mongoose.Types.ObjectId();

  const users = [
    {
      _id: adminId,
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: hashedPassword,
      role: 'admin',
      department: 'general',
      designation: 'ceo',
      companyId, managerId: null,
      isManagerApprover: false, budgetLimit: 0, phone: '+91 98100 11111', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      _id: managerId,
      name: 'Sneha',
      email: 'manager@demo.com',
      passwordHash: hashedPassword,
      role: 'manager',
      department: 'engineering',
      designation: 'manager',
      companyId, managerId: null,
      isManagerApprover: true, budgetLimit: 0, phone: '+91 98100 22222', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      _id: employeeId,
      name: 'Rahul',
      email: 'employee@demo.com',
      passwordHash: hashedPassword,
      role: 'employee',
      department: 'engineering',
      designation: 'employee',
      companyId, managerId: managerId,
      isManagerApprover: false, budgetLimit: 50000, phone: '+91 98100 33333', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      _id: financeManagerId,
      name: 'Amit Verma',
      email: 'financemanager@demo.com',
      passwordHash: hashedPassword,
      role: 'manager',
      department: 'finance',
      designation: 'manager',
      companyId, managerId: null,
      isManagerApprover: true, budgetLimit: 0, phone: '+91 98100 44444', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      _id: directorId,
      name: 'Raj',
      email: 'director@demo.com',
      passwordHash: hashedPassword,
      role: 'manager',
      department: 'general',
      designation: 'director',
      companyId, managerId: null,
      isManagerApprover: true, budgetLimit: 0, phone: '+91 98100 55555', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      _id: cfoId,
      name: 'Mehul',
      email: 'cfo@demo.com',
      passwordHash: hashedPassword,
      role: 'manager',
      department: 'finance',
      designation: 'cfo',
      companyId, managerId: null,
      isManagerApprover: true, budgetLimit: 0, phone: '+91 98100 66666', isActive: true,
      createdAt: new Date(), updatedAt: new Date()
    }
  ];

  await db.collection('users').insertMany(users);
  console.log('✅ Created 6 users (admin, manager, employee, finance, director, cfo)');

  // ─── EXPENSES ───
  const now = new Date();
  const daysAgo = (d) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt; };

  const expenses = [
    // === FULLY APPROVED (went through all 3 steps) ===
    {
      employeeId, companyId,
      amountOriginal: 2500, currencyOriginal: 'INR', amountCompanyCurrency: 2500,
      category: 'Food & Dining', description: 'Team lunch at Barbeque Nation - sprint completion',
      date: daysAgo(15),
      extractedFields: { merchant: 'Barbeque Nation', confidences: { merchant: 92, amount: 88, date: 85 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Well deserved, good job!', decidedAt: daysAgo(14) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'approved', comment: 'Within policy limits', decidedAt: daysAgo(13) },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'approved', comment: 'Approved', decidedAt: daysAgo(12) }
      ],
      status: 'approved', fraudFlags: [],
      createdAt: daysAgo(16), updatedAt: daysAgo(12)
    },
    {
      employeeId, companyId,
      amountOriginal: 799, currencyOriginal: 'INR', amountCompanyCurrency: 799,
      category: 'Communication', description: 'Jio postpaid monthly plan - Business phone',
      date: daysAgo(12),
      extractedFields: { merchant: 'Jio', confidences: { merchant: 95, amount: 92, date: 90 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Standard communication expense', decidedAt: daysAgo(11) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'approved', comment: 'OK', decidedAt: daysAgo(10) },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'approved', comment: '', decidedAt: daysAgo(9) }
      ],
      status: 'approved', fraudFlags: [],
      createdAt: daysAgo(12), updatedAt: daysAgo(9)
    },
    {
      employeeId, companyId,
      amountOriginal: 350, currencyOriginal: 'INR', amountCompanyCurrency: 350,
      category: 'Travel & Transport', description: 'Weekly parking at office premises - Electronic City',
      date: daysAgo(8),
      extractedFields: { merchant: 'EPIP Parking', confidences: { merchant: 75, amount: 90, date: 88 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Routine expense', decidedAt: daysAgo(7) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'approved', comment: '', decidedAt: daysAgo(6) },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'approved', comment: 'Approved', decidedAt: daysAgo(5) }
      ],
      status: 'approved', fraudFlags: [],
      createdAt: daysAgo(8), updatedAt: daysAgo(5)
    },
    {
      employeeId, companyId,
      amountOriginal: 1850, currencyOriginal: 'INR', amountCompanyCurrency: 1850,
      category: 'Office Supplies', description: 'Ergonomic keyboard and mouse - Logitech MX Keys combo',
      date: daysAgo(10),
      extractedFields: { merchant: 'Amazon India', confidences: { merchant: 97, amount: 95, date: 93 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Good for productivity', decidedAt: daysAgo(9) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'approved', comment: 'Under equipment limit', decidedAt: daysAgo(8) },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'approved', comment: '', decidedAt: daysAgo(7) }
      ],
      status: 'approved', fraudFlags: [],
      createdAt: daysAgo(10), updatedAt: daysAgo(7)
    },

    // === IN PROGRESS (Step 1 approved, Step 2 pending) ===
    {
      employeeId, companyId,
      amountOriginal: 580, currencyOriginal: 'INR', amountCompanyCurrency: 580,
      category: 'Food & Dining', description: 'Coffee meeting with potential hire - Starbucks Koramangala',
      date: daysAgo(5),
      extractedFields: { merchant: 'Starbucks', confidences: { merchant: 90, amount: 85, date: 88 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Good initiative for hiring', decidedAt: daysAgo(4) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'in_progress', fraudFlags: [],
      createdAt: daysAgo(5), updatedAt: daysAgo(4)
    },
    {
      employeeId, companyId,
      amountOriginal: 4500, currencyOriginal: 'INR', amountCompanyCurrency: 4500,
      category: 'Travel & Transport', description: 'Uber rides for client meetings - Bangalore to Whitefield (5 trips)',
      date: daysAgo(4),
      extractedFields: { merchant: 'Uber India', confidences: { merchant: 88, amount: 82, date: 90 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'approved', comment: 'Client meeting travel approved', decidedAt: daysAgo(3) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'in_progress', fraudFlags: [],
      createdAt: daysAgo(4), updatedAt: daysAgo(3)
    },

    // === PENDING (Step 1 not yet reviewed) ===
    {
      employeeId, companyId,
      amountOriginal: 1500, currencyOriginal: 'INR', amountCompanyCurrency: 1500,
      category: 'Office Supplies', description: 'WeWork day pass - Indiranagar for client proximity',
      date: daysAgo(1),
      extractedFields: { merchant: 'WeWork India', confidences: { merchant: 85, amount: 80, date: 90 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'pending', comment: '', decidedAt: null },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'pending', fraudFlags: [],
      createdAt: daysAgo(1), updatedAt: daysAgo(1)
    },
    {
      employeeId, companyId,
      amountOriginal: 150, currencyOriginal: 'GBP', amountCompanyCurrency: 15750,
      category: 'Training & Development', description: 'React Summit London 2026 - Early bird registration',
      date: daysAgo(2),
      extractedFields: { merchant: 'React Summit', confidences: { merchant: 70, amount: 65, date: 80 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'pending', comment: '', decidedAt: null },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'pending', fraudFlags: [],
      createdAt: daysAgo(2), updatedAt: daysAgo(2)
    },
    {
      employeeId, companyId,
      amountOriginal: 12000, currencyOriginal: 'INR', amountCompanyCurrency: 12000,
      category: 'Software & Tools', description: 'Annual Figma Professional license renewal',
      date: daysAgo(3),
      extractedFields: { merchant: 'Figma Inc', confidences: { merchant: 98, amount: 96, date: 94 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'pending', comment: '', decidedAt: null },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'pending', fraudFlags: [],
      createdAt: daysAgo(3), updatedAt: daysAgo(3)
    },

    // === REJECTED (manager rejected) ===
    {
      employeeId, companyId,
      amountOriginal: 15000, currencyOriginal: 'INR', amountCompanyCurrency: 15000,
      category: 'Entertainment', description: 'Client dinner at ITC Grand Chola - 8 guests',
      date: daysAgo(6),
      extractedFields: { merchant: 'ITC Grand Chola', confidences: { merchant: 88, amount: 82, date: 85 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'rejected', comment: 'Exceeds entertainment budget. Please pre-approve large client dinners.', decidedAt: daysAgo(5) },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'rejected', fraudFlags: [],
      createdAt: daysAgo(7), updatedAt: daysAgo(5)
    },

    // === FRAUD FLAGGED EXPENSE (duplicate) ===
    {
      employeeId, companyId,
      amountOriginal: 2500, currencyOriginal: 'INR', amountCompanyCurrency: 2500,
      category: 'Food & Dining', description: 'Team lunch at Barbeque Nation - duplicate submission',
      date: daysAgo(14),
      extractedFields: { merchant: 'Barbeque Nation', confidences: { merchant: 92, amount: 88, date: 85 } },
      approvers: [
        { userId: managerId, role: 'manager', department: 'engineering', designation: 'manager', sequenceStep: 1, decision: 'pending', comment: '', decidedAt: null },
        { userId: financeManagerId, role: 'manager', department: 'finance', designation: 'manager', sequenceStep: 2, decision: 'pending', comment: '', decidedAt: null },
        { userId: directorId, role: 'manager', department: 'general', designation: 'director', sequenceStep: 3, decision: 'pending', comment: '', decidedAt: null }
      ],
      status: 'pending',
      fraudFlags: [
        { type: 'duplicate_receipt', details: 'Possible duplicate: Same merchant "Barbeque Nation" and amount 2500 found within 2 days', flaggedAt: daysAgo(1) }
      ],
      createdAt: daysAgo(1), updatedAt: daysAgo(1)
    }
  ];

  await db.collection('expenses').insertMany(expenses);
  console.log(`✅ Created ${expenses.length} expenses (approved, in_progress, pending, rejected, fraud-flagged)`);

  // ─── AUDIT LOGS ───
  const auditLogs = [
    { action: 'company_created', performedBy: adminId, targetId: companyId, targetType: 'company', details: { companyName: 'TechNova Solutions' }, createdAt: daysAgo(30) },
    { action: 'user_created', performedBy: adminId, targetId: managerId, targetType: 'user', details: { email: 'manager@demo.com', role: 'manager' }, createdAt: daysAgo(29) },
    { action: 'user_created', performedBy: adminId, targetId: employeeId, targetType: 'user', details: { email: 'employee@demo.com', role: 'employee' }, createdAt: daysAgo(28) },
    { action: 'user_created', performedBy: adminId, targetId: financeManagerId, targetType: 'user', details: { email: 'financemanager@demo.com', role: 'manager' }, createdAt: daysAgo(27) },
    { action: 'user_created', performedBy: adminId, targetId: directorId, targetType: 'user', details: { email: 'director@demo.com', role: 'manager' }, createdAt: daysAgo(26) },
    { action: 'user_created', performedBy: adminId, targetId: cfoId, targetType: 'user', details: { email: 'cfo@demo.com', role: 'manager' }, createdAt: daysAgo(25) },
    { action: 'approval_rules_updated', performedBy: adminId, targetId: companyId, targetType: 'company', details: { changes: 'Set 3-step sequential approval chain' }, createdAt: daysAgo(24) },
    { action: 'budget_updated', performedBy: adminId, targetId: companyId, targetType: 'company', details: { departmentBudgets: '3 departments configured' }, createdAt: daysAgo(23) },
    ...expenses.filter(e => e.status === 'approved' || e.status === 'in_progress').map(e => ({
      action: 'expense_created', performedBy: employeeId, targetId: new mongoose.Types.ObjectId(), targetType: 'expense',
      details: { amount: e.amountOriginal, currency: e.currencyOriginal, category: e.category },
      createdAt: e.createdAt
    })),
    ...expenses.filter(e => e.approvers.some(a => a.decision === 'approved')).map(e => ({
      action: 'expense_approved', performedBy: managerId, targetId: new mongoose.Types.ObjectId(), targetType: 'expense',
      details: { decision: 'approved', step: 1, status: e.status },
      createdAt: e.approvers[0].decidedAt || e.updatedAt
    })),
    ...expenses.filter(e => e.status === 'rejected').map(e => ({
      action: 'expense_rejected', performedBy: managerId, targetId: new mongoose.Types.ObjectId(), targetType: 'expense',
      details: { decision: 'rejected', step: 1, comment: e.approvers[0].comment },
      createdAt: e.updatedAt
    }))
  ];

  await db.collection('auditlogs').insertMany(auditLogs);
  console.log(`✅ Created ${auditLogs.length} audit log entries`);

  // ─── SUMMARY ───
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║              EXPENSO MVP — DEMO DATA SEEDED                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Name         Email                Role       Dept       Desig   ║');
  console.log('║  ─────────────────────────────────────────────────────────────    ║');
  console.log('║  Admin User   admin@demo.com       Admin      General    CEO     ║');
  console.log('║  Sneha        manager@demo.com     Manager    Engg       Manager ║');
  console.log('║  Rahul        employee@demo.com    Employee   Engg       Employee║');
  console.log('║  Amit         financemanager@demo.com  Manager    Finance    Manager ║');
  console.log('║  Raj          director@demo.com    Manager    General    Director║');
  console.log('║  Mehul        cfo@demo.com         Manager    Finance    CFO     ║');
  console.log('║                                                                  ║');
  console.log('║  Password: password123 (all accounts)                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Approval Chain:                                                 ║');
  console.log('║    Step 1 → Reporting Manager (Sneha)                            ║');
  console.log('║    Step 2 → Dept=Finance (Amit — role:Manager, dept:finance)      ║');
  console.log('║    Step 3 → Designation=Director (Raj — role:Manager, desig:dir)  ║');
  console.log('║  CFO Override: Mehul (role:Manager, designation:CFO)              ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  KEY: Role = permissions | Designation = approval routing        ║');
  console.log('║  CFO has role:Manager (can approve) + designation:CFO (override) ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Expenses: 4 Approved | 2 In Progress | 3 Pending | 1 Rejected  ║');
  console.log('║  + 1 Fraud Flagged (duplicate receipt)                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
