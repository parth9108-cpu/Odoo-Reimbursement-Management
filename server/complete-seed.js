const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenzo_mvp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Company Schema
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  currencyCode: { type: String, required: true, default: 'USD' },
  approvalSequences: [{
    name: String,
    role: String,
    sequenceStep: Number
  }],
  conditionalRules: [{
    type: { type: String, enum: ['percentage', 'specific'] },
    threshold: Number,
    approverRole: String
  }]
}, { timestamps: true });

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'employee', 'finance', 'director', 'cfo'], required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isManagerApprover: { type: Boolean, default: false }
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
    sequenceStep: Number,
    decision: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: String,
    decidedAt: Date
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

const Company = mongoose.model('Company', companySchema);
const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);

const seedData = async () => {
  try {
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
        { name: 'Finance', role: 'finance', sequenceStep: 2 },
        { name: 'Director', role: 'director', sequenceStep: 3 }
      ],
      conditionalRules: [
        { type: 'percentage', threshold: 0.6 },
        { type: 'specific', approverRole: 'CFO' }
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

    // Create finance user
    const finance = new User({
      name: 'Finance User',
      email: 'finance@demo.com',
      passwordHash: 'password123',
      role: 'finance',
      companyId: company._id
    });
    await finance.save();
    console.log('Created finance user');

    // Create director user
    const director = new User({
      name: 'Director User',
      email: 'director@demo.com',
      passwordHash: 'password123',
      role: 'director',
      companyId: company._id
    });
    await director.save();
    console.log('Created director user');

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

    // Create another employee
    const employee2 = new User({
      name: 'John Smith',
      email: 'john@demo.com',
      passwordHash: 'password123',
      role: 'employee',
      companyId: company._id,
      managerId: manager._id
    });
    await employee2.save();
    console.log('Created second employee user');

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
          },
          {
            userId: finance._id,
            role: 'finance',
            sequenceStep: 2,
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
      },
      {
        employeeId: employee2._id,
        companyId: company._id,
        amountOriginal: 50,
        currencyOriginal: 'USD',
        amountCompanyCurrency: 4150, // 50 * 83 (approximate rate)
        category: 'Office Supplies',
        description: 'Stationery and office materials',
        date: new Date('2024-01-13'),
        extractedFields: {
          merchant: 'Office Depot',
          date: '13/01/2024',
          amount: '50.00',
          confidences: { merchant: 78, amount: 96, date: 85 }
        },
        approvers: [
          {
            userId: manager._id,
            role: 'manager',
            sequenceStep: 1,
            decision: 'approved',
            comment: 'Standard office supplies',
            decidedAt: new Date('2024-01-13')
          },
          {
            userId: finance._id,
            role: 'finance',
            sequenceStep: 2,
            decision: 'pending'
          }
        ],
        status: 'pending'
      },
      {
        employeeId: employee._id,
        companyId: company._id,
        amountOriginal: 2000,
        currencyOriginal: 'INR',
        amountCompanyCurrency: 2000,
        category: 'Entertainment',
        description: 'Client entertainment dinner',
        date: new Date('2024-01-12'),
        extractedFields: {
          merchant: 'Fine Dining Restaurant',
          date: '12/01/2024',
          amount: '2000',
          confidences: { merchant: 88, amount: 94, date: 92 }
        },
        approvers: [
          {
            userId: manager._id,
            role: 'manager',
            sequenceStep: 1,
            decision: 'rejected',
            comment: 'Exceeds entertainment budget limit',
            decidedAt: new Date('2024-01-12')
          }
        ],
        status: 'rejected'
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
    console.log('Finance: finance@demo.com / password123');
    console.log('Director: director@demo.com / password123');
    console.log('Employee: employee@demo.com / password123');
    console.log('Employee 2: john@demo.com / password123');
    console.log('========================\n');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();
