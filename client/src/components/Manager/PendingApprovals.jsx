import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Loader, AlertTriangle } from 'lucide-react';
import { expensesAPI } from '../../services/api';
import ApproveModal from './ApproveModal';
import ApprovalTimeline from '../Expense/ApprovalTimeline';

const PendingApprovals = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchPendingApprovals(); }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await expensesAPI.getExpenses();
      // Show expenses that are pending/in_progress and this user is an approver
      const pendingExpenses = response.data.filter(expense => {
        if (expense.status !== 'pending' && expense.status !== 'in_progress') return false;
        return expense.approvers.some(
          a => a.userId?._id === user.id && a.decision === 'pending'
        );
      });
      setExpenses(pendingExpenses);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMyTurn = (expense) => {
    // Find the current step (lowest pending sequenceStep)
    const pending = expense.approvers
      .filter(a => a.decision === 'pending')
      .sort((a, b) => a.sequenceStep - b.sequenceStep);

    if (pending.length === 0) return false;

    const currentStep = pending[0];
    return currentStep.userId?._id === user.id;
  };

  const getWaitingFor = (expense) => {
    const pending = expense.approvers
      .filter(a => a.decision === 'pending')
      .sort((a, b) => a.sequenceStep - b.sequenceStep);

    if (pending.length === 0) return null;
    const current = pending[0];
    if (current.userId?._id === user.id) return null;

    return current.userId?.name || 'Previous approver';
  };

  const handleApproval = async (expenseId, decision, comment) => {
    setActionLoading(expenseId);
    try {
      await expensesAPI.approveExpense(expenseId, decision, comment);
      setShowModal(false);
      setSelectedExpense(null);
      fetchPendingApprovals();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process approval');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount, currency) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount?.toFixed(2)}`;
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-6 px-4 text-center text-gray-500">Loading pending approvals...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="mt-1 text-gray-600">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} waiting for review
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {expenses.map((expense) => {
              const myTurn = isMyTurn(expense);
              const waitingFor = getWaitingFor(expense);

              return (
                <div key={expense._id} className={`bg-white shadow rounded-lg overflow-hidden border-l-4 ${
                  myTurn ? 'border-l-amber-500' : 'border-l-gray-300'
                }`}>
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-indigo-600">{expense.employeeId?.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{expense.employeeId?.name}</div>
                          <div className="text-xs text-gray-500">{expense.employeeId?.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expense.fraudFlags?.length > 0 && (
                          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Flagged
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          expense.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {expense.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Expense details */}
                    <div className="mb-3">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(expense.amountOriginal, expense.currencyOriginal)}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{expense.description}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">{expense.category}</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* OCR info */}
                    {expense.extractedFields?.merchant && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                        <span className="font-medium text-gray-600">OCR:</span>{' '}
                        <span className="text-gray-700">{expense.extractedFields.merchant}</span>
                        {expense.extractedFields.confidences?.merchant && (
                          <span className={`ml-2 px-1 py-0.5 rounded ${
                            expense.extractedFields.confidences.merchant >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{expense.extractedFields.confidences.merchant}% conf</span>
                        )}
                      </div>
                    )}

                    {/* Approval timeline (expandable) */}
                    <div className="mb-4">
                      <button onClick={() => setExpandedId(expandedId === expense._id ? null : expense._id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        {expandedId === expense._id ? '▼ Hide' : '▶ Show'} Approval Pipeline
                      </button>
                      {expandedId === expense._id && (
                        <div className="mt-2">
                          <ApprovalTimeline approvers={expense.approvers} status={expense.status} />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between border-t pt-3">
                      {myTurn ? (
                        <>
                          <button onClick={() => { setSelectedExpense(expense); setShowModal(true); }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                            <Eye className="h-4 w-4 mr-1" /> Review Details
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproval(expense._id, 'approved', 'Approved')}
                              disabled={actionLoading === expense._id}
                              className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50">
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedExpense(expense); setShowModal(true); }}
                              disabled={actionLoading === expense._id}
                              className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50">
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full text-center py-2 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-2 text-amber-500" />
                            Waiting for <span className="font-medium text-gray-700 ml-1">{waitingFor}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Sequential approval — previous step must complete first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && selectedExpense && (
          <ApproveModal
            expense={selectedExpense}
            onClose={() => { setShowModal(false); setSelectedExpense(null); }}
            onApprove={handleApproval}
          />
        )}
      </div>
    </div>
  );
};

export default PendingApprovals;
