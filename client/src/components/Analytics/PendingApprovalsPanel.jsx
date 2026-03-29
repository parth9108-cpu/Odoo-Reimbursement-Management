import React, { useState } from 'react';
import api from '../../services/api';

const PendingApprovalsPanel = ({ approvals, onApprovalAction, loading }) => {
  const [processing, setProcessing] = useState({});

  const handleApproval = async (expenseId, decision, comment = '') => {
    setProcessing(prev => ({ ...prev, [expenseId]: true }));
    
    try {
      await api.post(`/expenses/${expenseId}/approve`, {
        decision,
        comment
      });
      
      if (onApprovalAction) {
        onApprovalAction();
      }
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">✅</div>
        <p className="text-gray-500">No pending approvals</p>
        <p className="text-sm text-gray-400">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((expense) => (
        <div key={expense._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm">
                {expense.employeeId?.name || 'Unknown Employee'}
              </h4>
              <p className="text-xs text-gray-600 mb-1">
                {expense.category} • {formatDate(expense.createdAt)}
              </p>
              <p className="text-sm text-gray-800 line-clamp-2">
                {expense.description}
              </p>
            </div>
            <div className="text-right ml-3">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(expense.amountCompanyCurrency)}
              </div>
              {expense.extractedFields?.confidences?.merchant && (
                <div className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(expense.extractedFields.confidences.merchant)}`}>
                  {expense.extractedFields.confidences.merchant}% confidence
                </div>
              )}
            </div>
          </div>

          {/* OCR Extracted Fields */}
          {expense.extractedFields?.merchant && (
            <div className="mb-3 p-2 bg-white rounded border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Extracted from receipt:</div>
              <div className="text-sm">
                <span className="font-medium">{expense.extractedFields.merchant}</span>
                {expense.extractedFields.date && (
                  <span className="text-gray-600 ml-2">• {expense.extractedFields.date}</span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleApproval(expense._id, 'approved', 'Approved via dashboard')}
              disabled={processing[expense._id]}
              className="flex-1 bg-green-600 text-white text-xs py-2 px-3 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing[expense._id] ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => {
                const comment = prompt('Rejection reason (optional):');
                if (comment !== null) {
                  handleApproval(expense._id, 'rejected', comment || 'Rejected via dashboard');
                }
              }}
              disabled={processing[expense._id]}
              className="flex-1 bg-red-600 text-white text-xs py-2 px-3 rounded font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing[expense._id] ? 'Processing...' : 'Reject'}
            </button>
          </div>

          {/* Approval Chain */}
          {expense.approvers && expense.approvers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Approval Chain:</div>
              <div className="flex space-x-2">
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PendingApprovalsPanel;

