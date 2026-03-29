const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');
const Expense = require('./models/Expense');

const generateRandomExpenses = (employeeId, companyId, manager, finance, numberOfExpenses = 50) => {
  const categories = [
    'Food & Dining',
    'Travel & Transport',
    'Office Supplies',
    'Entertainment',
    'Training & Development',
    'Marketing',
    'IT & Software',
    'Utilities',
    'Miscellaneous'
  ];

  const merchants = {
    'Food & Dining': ['Restaurant ABC', 'Cafeteria XYZ', 'Coffee Shop', 'Food Court', 'Catering Services'],
    'Travel & Transport': ['Uber', 'Ola', 'Indian Railways', 'Air India', 'SpiceJet'],
    'Office Supplies': ['Office Depot', 'Staples', 'Amazon', 'Local Stationery', 'Printer Solutions'],
    'Entertainment': ['Fine Dining Restaurant', 'Cinema Hall', 'Event Space', 'Corporate Club', 'Golf Club'],
    'Training & Development': ['Udemy', 'Coursera', 'Training Center', 'Conference Hall', 'Workshop Venue'],
    'Marketing': ['Facebook Ads', 'Google Ads', 'Print Shop', 'Event Management', 'Design Studio'],
    'IT & Software': ['Microsoft', 'Adobe', 'AWS', 'Digital Ocean', 'GitHub'],
    'Utilities': ['Electricity Board', 'Internet Provider', 'Mobile Carrier', 'Water Supply', 'Maintenance'],
    'Miscellaneous': ['Local Store', 'General Shop', 'Department Store', 'Service Center', 'Hardware Shop']
  };

  const expenses = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  for (let i = 0; i < numberOfExpenses; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const merchant = merchants[category][Math.floor(Math.random() * merchants[category].length)];
    const amount = Math.floor(Math.random() * 9000) + 1000; // Random amount between 1000 and 10000
    const date = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    
    // Determine status and approvers based on business logic
    const isHighAmount = amount > 5000;
    let status = 'pending';
    let approvers = [
      {
        userId: manager._id,
        role: 'manager',
        sequenceStep: 1,
        decision: Math.random() > 0.3 ? 'approved' : 'pending'
      }
    ];

    if (approvers[0].decision === 'approved' && isHighAmount) {
      approvers.push({
        userId: finance._id,
        role: 'finance',
        sequenceStep: 2,
        decision: Math.random() > 0.4 ? 'approved' : 'pending'
      });
    }

    // Set final status based on approvers
    if (approvers.every(a => a.decision === 'approved')) {
      status = 'approved';
    } else if (approvers.some(a => a.decision === 'rejected')) {
      status = 'rejected';
    }

    // Add decided dates for approved/rejected decisions
    approvers = approvers.map(a => ({
      ...a,
      decidedAt: a.decision !== 'pending' ? date : undefined,
      comment: a.decision === 'rejected' ? 'Exceeds budget limits' : 
               a.decision === 'approved' ? 'Within policy limits' : undefined
    }));

    expenses.push({
      employeeId,
      companyId,
      amountOriginal: amount,
      currencyOriginal: 'INR',
      amountCompanyCurrency: amount,
      category,
      description: `Expense at ${merchant}`,
      date,
      extractedFields: {
        merchant,
        date: date.toLocaleDateString(),
        amount: amount.toString(),
        confidences: { merchant: 85, amount: 95, date: 90 }
      },
      approvers,
      status
    });
  }

  return expenses;
};

const seedAnalyticsData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenzo_mvp');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Expense.deleteMany({});
    console.log('Cleared existing data');

    // Create company
    const company = new Company({
      name: 'TechCorp Solutions',
      country: 'India',
      currencyCode: 'INR',
      approvalSequences: [
        { name: 'Manager', role: 'manager', sequenceStep: 1 },
        { name: 'Finance', role: 'finance', sequenceStep: 2 }
      ],
      conditionalRules: [
        { type: 'percentage', threshold: 0.6 }
      ]
    });
    await company.save();
    console.log('Created company');

    // Create users
    const admin = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: 'password123',
      role: 'admin',
      companyId: company._id
    });
    await admin.save();

    const manager = new User({
      name: 'Manager User',
      email: 'manager@demo.com',
      passwordHash: 'password123',
      role: 'manager',
      companyId: company._id,
      isManagerApprover: true
    });
    await manager.save();

    const finance = new User({
      name: 'Finance User',
      email: 'finance@demo.com',
      passwordHash: 'password123',
      role: 'finance',
      companyId: company._id
    });
    await finance.save();

    const employee1 = new User({
      name: 'Employee One',
      email: 'employee1@demo.com',
      passwordHash: 'password123',
      role: 'employee',
      companyId: company._id,
      managerId: manager._id
    });
    await employee1.save();

    const employee2 = new User({
      name: 'Employee Two',
      email: 'employee2@demo.com',
      passwordHash: 'password123',
      role: 'employee',
      companyId: company._id,
      managerId: manager._id
    });
    await employee2.save();

    console.log('Created users');

    // Generate random expenses for both employees
    const employee1Expenses = generateRandomExpenses(employee1._id, company._id, manager, finance, 30);
    const employee2Expenses = generateRandomExpenses(employee2._id, company._id, manager, finance, 20);

    // Save all expenses
    await Expense.insertMany([...employee1Expenses, ...employee2Expenses]);
    console.log('Created sample expenses');

    console.log('\n=== ANALYTICS SEED DATA CREATED ===');
    console.log('Added 50 sample expenses across various categories');
    console.log('Login credentials:');
    console.log('Admin: admin@demo.com / password123');
    console.log('Manager: manager@demo.com / password123');
    console.log('Finance: finance@demo.com / password123');
    console.log('Employee 1: employee1@demo.com / password123');
    console.log('Employee 2: employee2@demo.com / password123');
    console.log('================================\n');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedAnalyticsData();