import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Image, FileText } from 'lucide-react';

const ApproveModal = ({ expense, onClose, onApprove }) => {
  const [decision, setDecision] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount, currency) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€' };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  const handleSubmit = async () => {
    if (!decision) return;
    
    setLoading(true);
    try {
      await onApprove(expense._id, decision, comment);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Review Expense
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Details */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Expense Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Employee:</span>
                  <span className="font-medium">{expense.employeeId.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(expense.amountOriginal, expense.currencyOriginal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{expense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {new Date(expense.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium">{expense.description}</span>
                </div>
              </div>
            </div>

            {/* OCR Extracted Fields */}
            {expense.extractedFields && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  OCR Extracted Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Merchant:</span>
                    <span className="font-medium">{expense.extractedFields.merchant}</span>
                  </div>
                  {expense.extractedFields.confidences && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">Confidence Scores:</div>
                      <div className="space-y-1">
                        {Object.entries(expense.extractedFields.confidences).map(([field, confidence]) => (
                          <div key={field} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 capitalize">{field}:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    confidence >= 80 ? 'bg-green-500' :
                                    confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium">{confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval History */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Approval History</h4>
              <div className="space-y-2">
                {expense.approvers.map((approver, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{approver.userId.name} ({approver.role})</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      approver.decision === 'approved' ? 'bg-green-100 text-green-800' :
                      approver.decision === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {approver.decision}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipt Image */}
          <div className="space-y-4">
            {expense.receiptImagePath && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Image className="h-4 w-4 mr-2" />
                  Receipt Image
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={expense.receiptImagePath}
                    alt="Receipt"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Approval Actions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Your Decision</h4>
              
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setDecision('approved')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md ${
                      decision === 'approved'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => setDecision('rejected')}
                    className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md ${
                      decision === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                </div>

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Add a comment about your decision..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!decision || loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Submit Decision'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproveModal;

