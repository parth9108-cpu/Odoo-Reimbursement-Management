import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader, AlertTriangle } from 'lucide-react';
import { expensesAPI } from '../../services/api';
import ApprovalTimeline from './ApprovalTimeline';

const ExpenseList = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    try {
      const response = await expensesAPI.getExpenses();
      setExpenses(response.data);
    } catch (error) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress': return <Loader className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'in_progress') return 'In Progress';
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  const formatCurrency = (amount, currency) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount?.toFixed(2)}`;
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-6 px-4 text-center text-gray-500">Loading expenses...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
            <p className="mt-1 text-sm text-gray-600">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} total.
              Click any row to see the approval pipeline.
            </p>
          </div>
          {user?.role === 'employee' && (
            <Link to="/expenses/new"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Link>
          )}
        </div>

        {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipeline</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">No expenses found.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <React.Fragment key={expense._id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === expense._id ? null : expense._id)}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        <div className="text-xs text-gray-500">{expense.employeeId?.name}</div>
                        {expense.fraudFlags?.length > 0 && (
                          <span className="inline-flex items-center text-xs text-red-600 mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Flagged
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(expense.amountOriginal, expense.currencyOriginal)}
                        {expense.currencyOriginal !== 'INR' && (
                          <div className="text-xs text-gray-400">≈ ₹{expense.amountCompanyCurrency?.toFixed(0)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{expense.category}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(expense.status)}
                          <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                            {getStatusLabel(expense.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {/* Mini pipeline preview */}
                        <div className="flex items-center gap-1">
                          {expense.approvers?.map((a, i) => (
                            <React.Fragment key={i}>
                              <div className={`w-3 h-3 rounded-full ${
                                a.decision === 'approved' ? 'bg-green-500' :
                                a.decision === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
                              }`} title={`Step ${a.sequenceStep}: ${a.decision}`}></div>
                              {i < expense.approvers.length - 1 && <div className="w-2 h-0.5 bg-gray-300"></div>}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {expandedId === expense._id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </td>
                    </tr>

                    {/* Expanded approval timeline */}
                    {expandedId === expense._id && (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 bg-gray-50">
                          <div className="max-w-lg">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Approval Pipeline</h4>
                            <ApprovalTimeline approvers={expense.approvers} status={expense.status} />

                            {/* OCR info */}
                            {expense.extractedFields?.merchant && (
                              <div className="mt-4 p-3 bg-white rounded-md border">
                                <div className="text-xs font-medium text-gray-500 mb-1">OCR Extracted Data</div>
                                <div className="text-sm text-gray-700">Merchant: {expense.extractedFields.merchant}</div>
                                {expense.extractedFields.confidences && (
                                  <div className="flex gap-2 mt-1">
                                    {Object.entries(expense.extractedFields.confidences).map(([field, conf]) => (
                                      <span key={field} className={`px-1.5 py-0.5 rounded text-xs ${
                                        conf >= 80 ? 'bg-green-100 text-green-700' :
                                        conf >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                      }`}>{field}: {conf}%</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Fraud flags */}
                            {expense.fraudFlags?.length > 0 && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="text-xs font-medium text-red-700 mb-1 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Fraud Flags
                                </div>
                                {expense.fraudFlags.map((flag, i) => (
                                  <div key={i} className="text-xs text-red-600 mt-0.5">• {flag.details}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;
