const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Company = require('./models/Company');
const Expense = require('./models/Expense');

const seedData = async () => {
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
      name: 'Demo Company',
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

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      passwordHash: 'password123',
      role: 'admin',
      companyId: company._id
    });
    await admin.save();
    console.log('Created admin user');

    // Create manager user
    const manager = new User({
      name: 'Manager User',
      email: 'manager@demo.com',
      passwordHash: 'password123',
      role: 'manager',
      companyId: company._id,
      isManagerApprover: true
    });
    await manager.save();
    console.log('Created manager user');

    // Create employee user
    const employee = new User({
      name: 'Employee User',
      email: 'employee@demo.com',
      passwordHash: 'password123',
      role: 'employee',
      companyId: company._id,
      managerId: manager._id
    });
    await employee.save();
    console.log('Created employee user');

    // Create sample expenses
    const sampleExpenses = [
      {
        employeeId: employee._id,
        companyId: company._id,
        amountOriginal: 500,
        currencyOriginal: 'INR',
        amountCompanyCurrency: 500,
        category: 'Food & Dining',
        description: 'Team lunch at restaurant',
        date: new Date('2024-01-15'),
        extractedFields: {
          merchant: 'Restaurant ABC',
          date: '15/01/2024',
          amount: '500',
          confidences: { merchant: 85, amount: 95, date: 90 }
        },
        approvers: [
          {
            userId: manager._id,
            role: 'manager',
            sequenceStep: 1,
            decision: 'pending'
          }
        ],
        status: 'pending'
      },
      {
        employeeId: employee._id,
        companyId: company._id,
        amountOriginal: 1200,
        currencyOriginal: 'INR',
        amountCompanyCurrency: 1200,
        category: 'Travel & Transport',
        description: 'Taxi fare to client meeting',
        date: new Date('2024-01-14'),
        extractedFields: {
          merchant: 'Uber',
          date: '14/01/2024',
          amount: '1200',
          confidences: { merchant: 92, amount: 98, date: 88 }
        },
        approvers: [
          {
            userId: manager._id,
            role: 'manager',
            sequenceStep: 1,
            decision: 'approved',
            comment: 'Approved for client meeting',
            decidedAt: new Date('2024-01-14')
          }
        ],
        status: 'approved'
      }
    ];

    for (const expenseData of sampleExpenses) {
      const expense = new Expense(expenseData);
      await expense.save();
    }
    console.log('Created sample expenses');

    console.log('\n=== SEED DATA CREATED ===');
    console.log('Admin: admin@demo.com / password123');
    console.log('Manager: manager@demo.com / password123');
    console.log('Employee: employee@demo.com / password123');
    console.log('========================\n');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();

