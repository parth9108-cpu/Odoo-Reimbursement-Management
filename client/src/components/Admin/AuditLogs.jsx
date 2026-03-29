import React, { useState, useEffect } from 'react';
import { ClipboardList, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { auditAPI } from '../../services/api';

const ACTION_LABELS = {
  expense_created: { label: 'Expense Created', color: 'bg-blue-100 text-blue-800', icon: '📝' },
  expense_approved: { label: 'Expense Approved', color: 'bg-green-100 text-green-800', icon: '✅' },
  expense_rejected: { label: 'Expense Rejected', color: 'bg-red-100 text-red-800', icon: '❌' },
  user_created: { label: 'User Created', color: 'bg-purple-100 text-purple-800', icon: '👤' },
  user_updated: { label: 'User Updated', color: 'bg-yellow-100 text-yellow-800', icon: '✏️' },
  user_deleted: { label: 'User Deleted', color: 'bg-red-100 text-red-800', icon: '🗑️' },
  company_created: { label: 'Company Created', color: 'bg-indigo-100 text-indigo-800', icon: '🏢' },
  approval_rules_updated: { label: 'Rules Updated', color: 'bg-amber-100 text-amber-800', icon: '⚙️' },
  budget_updated: { label: 'Budget Updated', color: 'bg-teal-100 text-teal-800', icon: '💰' },
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => { fetchLogs(); }, [page, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterAction) params.action = filterAction;
      const res = await auditAPI.getLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getActionInfo = (action) => ACTION_LABELS[action] || { label: action, color: 'bg-gray-100 text-gray-800', icon: '📋' };

  const renderDetails = (log) => {
    if (!log.details) return null;
    const d = log.details;
    if (d.amount) return <span>₹{d.amount} - {d.category}</span>;
    if (d.email) return <span>{d.email} ({d.role})</span>;
    if (d.decision) return <span>Decision: {d.decision} | Step {d.step}</span>;
    if (d.name) return <span>{d.name} ({d.email})</span>;
    return <span className="text-gray-400">—</span>;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ClipboardList className="h-8 w-8 mr-3 text-indigo-600" /> Audit Trail
            </h1>
            <p className="mt-1 text-gray-600">Complete log of all system actions ({total} entries)</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
              className="border rounded-md px-3 py-2 text-sm">
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                return (
                  <div key={log._id} className="px-6 py-4 flex items-center hover:bg-gray-50">
                    <div className="text-2xl mr-4">{actionInfo.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-sm text-gray-500">by</span>
                        <span className="text-sm font-medium text-gray-900">
                          {log.performedBy?.name || 'System'}
                        </span>
                        <span className="text-xs text-gray-400">({log.performedBy?.role})</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{renderDetails(log)}</div>
                    </div>
                    <div className="text-sm text-gray-400 whitespace-nowrap ml-4">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-t">
              <span className="text-sm text-gray-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white">
                  <ChevronLeft className="h-4 w-4 inline" /> Prev
                </button>
                <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white">
                  Next <ChevronRight className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
