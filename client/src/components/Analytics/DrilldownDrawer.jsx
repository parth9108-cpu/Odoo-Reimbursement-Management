import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DrilldownDrawer = ({ data, onClose, onAction }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    if (data) {
      fetchExpenses();
    }
  }, [data]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let query = '';
      
      if (data.type === 'category') {
        query = `category=${encodeURIComponent(data.category)}`;
      } else if (data.type === 'merchant') {
        query = `merchant=${encodeURIComponent(data.merchant)}`;
      } else if (data.type === 'timeseries') {
        const date = new Date(data.date);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        query = `from=${date.toISOString().split('T')[0]}&to=${nextDay.toISOString().split('T')[0]}`;
      }

      const response = await api.get(`/expenses?${query}&limit=20`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (expenseId, decision, comment = '') => {
    setProcessing(prev => ({ ...prev, [expenseId]: true }));
    
    try {
      await api.post(`/expenses/${expenseId}/approve`, {
        decision,
        comment
      });
      
      if (onAction) {
        onAction();
      }
      
      // Refresh the list
      fetchExpenses();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to process approval. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {data.type === 'category' && `Expenses in ${data.category}`}
              {data.type === 'merchant' && `Expenses from ${data.merchant}`}
              {data.type === 'timeseries' && `Expenses on ${new Date(data.date).toLocaleDateString()}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {expenses.length} expenses found
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📄</div>
              <p className="text-gray-500">No expenses found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {expense.employeeId?.name || 'Unknown Employee'}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.status)}`}>
                          {expense.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {expense.category} • {formatDate(expense.createdAt)}
                      </p>
                      <p className="text-sm text-gray-800 mb-2">
                        {expense.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(expense.amountCompanyCurrency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {expense.currencyOriginal} → INR
                      </div>
                    </div>
                  </div>

                  {/* OCR Extracted Fields */}
                  {expense.extractedFields && (
                    <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs text-gray-500 mb-2">Extracted from receipt:</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {expense.extractedFields.merchant && (
                          <div>
                            <div className="text-xs text-gray-500">Merchant</div>
                            <div className="text-sm font-medium flex items-center space-x-2">
                              <span>{expense.extractedFields.merchant}</span>
                              {expense.extractedFields.confidences?.merchant && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(expense.extractedFields.confidences.merchant)}`}>
                                  {expense.extractedFields.confidences.merchant}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {expense.extractedFields.date && (
                          <div>
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="text-sm font-medium flex items-center space-x-2">
                              <span>{expense.extractedFields.date}</span>
                              {expense.extractedFields.confidences?.date && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(expense.extractedFields.confidences.date)}`}>
                                  {expense.extractedFields.confidences.date}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {expense.extractedFields.amount && (
                          <div>
                            <div className="text-xs text-gray-500">Amount</div>
                            <div className="text-sm font-medium flex items-center space-x-2">
                              <span>{expense.extractedFields.amount}</span>
                              {expense.extractedFields.confidences?.amount && (
                                <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(expense.extractedFields.confidences.amount)}`}>
                                  {expense.extractedFields.confidences.amount}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Receipt Image */}
                  {expense.receiptImagePath && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-2">Receipt:</div>
                      <div className="w-32 h-20 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-500">📄 Receipt</span>
                      </div>
                    </div>
                  )}

                  {/* Approval Chain */}
                  {expense.approvers && expense.approvers.length > 0 && (
                    <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                      <div className="text-xs text-gray-500 mb-2">Approval Chain:</div>
                      <div className="flex flex-wrap gap-2">
                        {expense.approvers.map((approver, index) => (
                          <div
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full ${
                              approver.decision === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : approver.decision === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {approver.role} {approver.decision === 'pending' ? '(pending)' : `(${approver.decision})`}
                            {approver.comment && (
                              <span className="ml-1 text-gray-500">- {approver.comment}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {expense.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproval(expense._id, 'approved', 'Approved via drilldown')}
                        disabled={processing[expense._id]}
                        className="flex-1 bg-green-600 text-white text-sm py-2 px-3 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[expense._id] ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          const comment = prompt('Rejection reason (optional):');
                          if (comment !== null) {
                            handleApproval(expense._id, 'rejected', comment || 'Rejected via drilldown');
                          }
                        }}
                        disabled={processing[expense._id]}
                        className="flex-1 bg-red-600 text-white text-sm py-2 px-3 rounded font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[expense._id] ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrilldownDrawer;

