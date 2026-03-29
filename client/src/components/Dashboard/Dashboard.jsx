import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle, Users, BarChart3, Settings, ClipboardList, AlertTriangle, TrendingUp, Clock, XCircle, DollarSign } from 'lucide-react';
import { dashboardAPI } from '../../services/api';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getStats()
      .then(res => setStats(res.data))
      .catch(err => console.error('Dashboard stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  };

  const getQuickActions = () => {
    const actions = [];
    if (user.role === 'employee') {
      actions.push({ title: 'Add Expense', description: 'Create a new expense entry', icon: Plus, link: '/expenses/new', color: 'bg-blue-500 hover:bg-blue-600' });
      actions.push({ title: 'View Expenses', description: 'See all your expenses', icon: FileText, link: '/expenses', color: 'bg-green-500 hover:bg-green-600' });
    }
    if (user.role === 'manager') {
      actions.push({ title: 'Pending Approvals', description: 'Review & approve expenses', icon: CheckCircle, link: '/approvals', color: 'bg-amber-500 hover:bg-amber-600' });
      actions.push({ title: 'Team Expenses', description: 'View team spending', icon: FileText, link: '/expenses', color: 'bg-green-500 hover:bg-green-600' });
      actions.push({ title: 'Analytics', description: 'Spend patterns & insights', icon: BarChart3, link: '/analytics', color: 'bg-indigo-500 hover:bg-indigo-600' });
    }
    if (user.role === 'admin') {
      actions.push({ title: 'Pending Approvals', description: 'Review expenses', icon: CheckCircle, link: '/approvals', color: 'bg-amber-500 hover:bg-amber-600' });
      actions.push({ title: 'Manage Users', description: 'Add & manage team', icon: Users, link: '/admin/users', color: 'bg-purple-500 hover:bg-purple-600' });
      actions.push({ title: 'Approval Flow', description: 'Configure approval chain', icon: Settings, link: '/admin/approval-flow', color: 'bg-teal-500 hover:bg-teal-600' });
      actions.push({ title: 'Analytics', description: 'Company-wide insights', icon: BarChart3, link: '/analytics', color: 'bg-indigo-500 hover:bg-indigo-600' });
      actions.push({ title: 'Audit Logs', description: 'Track all actions', icon: ClipboardList, link: '/admin/audit-logs', color: 'bg-gray-600 hover:bg-gray-700' });
      actions.push({ title: 'All Expenses', description: 'View all expenses', icon: FileText, link: '/expenses', color: 'bg-green-500 hover:bg-green-600' });
    }
    return actions;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="mt-1 text-gray-600">
            {user.role === 'admin' && `Company Admin • ${user.designation?.replace('_', ' ').toUpperCase() || 'Administrator'}`}
            {user.role === 'manager' && `Team Manager • ${user.department?.charAt(0).toUpperCase() + user.department?.slice(1)} Department`}
            {user.role === 'employee' && `${user.designation?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Employee'} • ${user.department?.charAt(0).toUpperCase() + user.department?.slice(1)} Department`}
          </p>
        </div>

        {/* Stats cards */}
        {!loading && stats && (
          <div className="mb-8">
            {user.role === 'admin' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="indigo" />
                <StatCard icon={FileText} label="Total Expenses" value={stats.totalExpenses} color="blue" />
                <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingApprovals} color="amber" />
                <StatCard icon={DollarSign} label="Monthly Spend" value={formatCurrency(stats.monthlySpend)} color="green" />
                <StatCard icon={AlertTriangle} label="Fraud Alerts" value={stats.fraudAlerts} color={stats.fraudAlerts > 0 ? 'red' : 'gray'} />
              </div>
            )}

            {user.role === 'manager' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Team Size" value={stats.teamSize} color="indigo" />
                <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingApprovals} color="amber" />
                <StatCard icon={DollarSign} label="Team Spend (Month)" value={formatCurrency(stats.teamSpend)} color="green" />
              </div>
            )}

            {user.role === 'employee' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={FileText} label="Total Expenses" value={stats.totalExpenses} color="blue" />
                <StatCard icon={Clock} label="Pending" value={stats.pending} color="amber" />
                <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="green" />
                <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="red" />
              </div>
            )}

            {/* Budget utilization for employees */}
            {user.role === 'employee' && stats.budgetLimit > 0 && (
              <div className="mt-4 bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Monthly Budget Utilization</span>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(stats.monthlySpend)} / {formatCurrency(stats.budgetLimit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      (stats.monthlySpend / stats.budgetLimit) > 0.9 ? 'bg-red-500' :
                      (stats.monthlySpend / stats.budgetLimit) > 0.7 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (stats.monthlySpend / stats.budgetLimit) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getQuickActions().map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Link key={index} to={action.link}
                className={`${action.color} rounded-lg p-5 text-white transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg`}>
                <div className="flex items-center">
                  <IconComponent className="h-8 w-8 mr-4 opacity-90" />
                  <div>
                    <h3 className="text-lg font-semibold">{action.title}</h3>
                    <p className="text-sm opacity-80">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent audit logs for admin */}
        {user.role === 'admin' && stats?.recentLogs?.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Link to="/admin/audit-logs" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
            </div>
            <div className="space-y-3">
              {stats.recentLogs.map((log, i) => (
                <div key={i} className="flex items-center text-sm">
                  <span className="text-gray-400 w-32 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-medium text-gray-700 mr-2">{log.performedBy?.name || 'System'}</span>
                  <span className="text-gray-500">{log.action?.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.gray}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 opacity-70" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs mt-1 opacity-70">{label}</p>
    </div>
  );
};

export default Dashboard;
