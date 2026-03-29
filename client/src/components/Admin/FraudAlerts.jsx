import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Eye, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { expensesAPI } from '../../services/api';
import ApprovalTimeline from '../Expense/ApprovalTimeline';

const FraudAlerts = () => {
  const [flaggedExpenses, setFlaggedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchFraudAlerts(); }, []);

  const fetchFraudAlerts = async () => {
    try {
      const res = await expensesAPI.getFraudAlerts();
      // Ensure each expense has fraudFlags array
      const data = (res.data || []).map(e => ({ ...e, fraudFlags: e.fraudFlags || [] }));
      setFlaggedExpenses(data);
    } catch (err) {
      // Fallback: fetch all expenses and filter fraud-flagged ones
      try {
        const res = await expensesAPI.getExpenses();
        const flagged = res.data.filter(e => e.fraudFlags && e.fraudFlags.length > 0);
        setFlaggedExpenses(flagged);
      } catch (err2) {
        setError('Failed to fetch fraud alerts');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFlagTypeInfo = (type) => {
    switch (type) {
      case 'duplicate_receipt':
        return { label: 'Duplicate Receipt', color: 'bg-red-100 text-red-800', icon: '🔄', severity: 'High' };
      case 'budget_exceeded':
        return { label: 'Budget Exceeded', color: 'bg-orange-100 text-orange-800', icon: '💰', severity: 'Medium' };
      case 'anomalous_amount':
        return { label: 'Anomalous Amount', color: 'bg-yellow-100 text-yellow-800', icon: '📊', severity: 'Medium' };
      case 'weekend_submission':
        return { label: 'Weekend Submission', color: 'bg-blue-100 text-blue-800', icon: '📅', severity: 'Low' };
      default:
        return { label: type?.replace(/_/g, ' ') || 'Unknown', color: 'bg-gray-100 text-gray-800', icon: '⚠️', severity: 'Low' };
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {status === 'in_progress' ? 'In Progress' : status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount, currency) => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || currency} ${amount?.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 text-center">
        <div className="text-gray-500">Scanning for fraud alerts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 mr-3 text-red-600" /> Fraud Detection & Alerts
          </h1>
          <p className="mt-1 text-gray-600">
            Review flagged expenses for potential fraud, duplicates, and policy violations
          </p>
        </div>

        {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{flaggedExpenses.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Total Flagged</p>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">🔄</span>
              <span className="text-2xl font-bold text-red-600">
                {flaggedExpenses.reduce((c, e) => c + (e.fraudFlags || []).filter(f => f.type === 'duplicate_receipt').length, 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Duplicate Receipts</p>
          </div>
          <div className="bg-white rounded-lg border border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">💰</span>
              <span className="text-2xl font-bold text-orange-600">
                {flaggedExpenses.reduce((c, e) => c + (e.fraudFlags || []).filter(f => f.type === 'budget_exceeded').length, 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Budget Exceeded</p>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">📊</span>
              <span className="text-2xl font-bold text-yellow-600">
                {flaggedExpenses.reduce((c, e) => c + (e.fraudFlags || []).filter(f => f.type === 'anomalous_amount').length, 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Anomalous Amounts</p>
          </div>
        </div>

        {/* Flagged expenses list */}
        {flaggedExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Shield className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Fraud Alerts</h3>
            <p className="mt-1 text-sm text-gray-500">All expenses look clean. No suspicious activity detected.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flaggedExpenses.map((expense) => (
              <div key={expense._id} className="bg-white shadow rounded-lg border-l-4 border-l-red-500 overflow-hidden">
                <div className="p-5">
                  {/* Expense header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>By: <strong>{expense.employeeId?.name}</strong></span>
                          <span>•</span>
                          <span>{formatDate(expense.date)}</span>
                          <span>•</span>
                          <span className="font-medium">{formatCurrency(expense.amountOriginal, expense.currencyOriginal)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(expense.status)}
                    </div>
                  </div>

                  {/* Fraud flags */}
                  <div className="space-y-2 mb-4">
                    {(expense.fraudFlags || []).map((flag, index) => {
                      const info = getFlagTypeInfo(flag.type);
                      return (
                        <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                          info.severity === 'High' ? 'border-red-200 bg-red-50' :
                          info.severity === 'Medium' ? 'border-orange-200 bg-orange-50' :
                          'border-yellow-200 bg-yellow-50'
                        }`}>
                          <span className="text-xl flex-shrink-0">{info.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${info.color}`}>
                                {info.label}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                info.severity === 'High' ? 'bg-red-200 text-red-800' :
                                info.severity === 'Medium' ? 'bg-orange-200 text-orange-800' :
                                'bg-yellow-200 text-yellow-800'
                              }`}>
                                {info.severity} Severity
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{flag.details}</p>
                            {flag.flaggedAt && (
                              <p className="text-xs text-gray-400 mt-1">Flagged: {formatDate(flag.flaggedAt)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expense details row */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">{expense.category}</span>
                    {expense.extractedFields?.merchant && (
                      <span>Merchant: <strong>{expense.extractedFields.merchant}</strong></span>
                    )}
                    {expense.currencyOriginal !== 'INR' && (
                      <span>Company value: ₹{expense.amountCompanyCurrency?.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  {/* Expandable approval timeline */}
                  <div className="border-t pt-3">
                    <button
                      onClick={() => setExpandedId(expandedId === expense._id ? null : expense._id)}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedId === expense._id ? 'Hide' : 'View'} Approval Pipeline
                      {expandedId === expense._id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </button>
                    {expandedId === expense._id && (
                      <div className="mt-3 max-w-lg">
                        <ApprovalTimeline approvers={expense.approvers} status={expense.status} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudAlerts;
