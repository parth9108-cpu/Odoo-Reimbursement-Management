import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/Dashboard/Dashboard';
import ExpenseForm from './components/Expense/ExpenseForm';
import ExpenseList from './components/Expense/ExpenseList';
import PendingApprovals from './components/Manager/PendingApprovals';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import ManageUsers from './components/Admin/ManageUsers';
import ApprovalFlowConfig from './components/Admin/ApprovalFlowConfig';
import AuditLogs from './components/Admin/AuditLogs';
import FraudAlerts from './components/Admin/FraudAlerts';
import { authAPI } from './services/api';

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link to={to} className={`text-sm px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
      {children}
    </Link>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(response => setUser(response.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && (
          <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-1">
                  <Link to="/dashboard" className="text-xl font-bold text-indigo-600 mr-4">
                    Expenso
                  </Link>
                  <div className="hidden md:flex items-center space-x-1">
                    <NavLink to="/dashboard">Dashboard</NavLink>
                    <NavLink to="/expenses">Expenses</NavLink>

                    {user.role === 'employee' && (
                      <NavLink to="/expenses/new">Add Expense</NavLink>
                    )}

                    {(user.role === 'manager' || user.role === 'admin') && (
                      <NavLink to="/approvals">Approvals</NavLink>
                    )}

                    {(user.role === 'admin' || user.role === 'manager') && (
                      <NavLink to="/analytics">Analytics</NavLink>
                    )}

                    {user.role === 'admin' && (
                      <>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <NavLink to="/admin/users">Users</NavLink>
                        <NavLink to="/admin/approval-flow">Approval Flow</NavLink>
                        <NavLink to="/admin/audit-logs">Audit Logs</NavLink>
                        <NavLink to="/admin/fraud-alerts">Fraud Alerts</NavLink>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role} • {user.designation?.replace('_', ' ') || user.role}</div>
                  </div>
                  <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">{user.name?.charAt(0)}</span>
                  </div>
                  <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup onLogin={handleLogin} />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/expenses" element={user ? <ExpenseList user={user} /> : <Navigate to="/login" />} />
          <Route path="/expenses/new" element={user ? <ExpenseForm user={user} /> : <Navigate to="/login" />} />
          <Route path="/approvals" element={
            user && (user.role === 'manager' || user.role === 'admin')
              ? <PendingApprovals user={user} />
              : <Navigate to="/dashboard" />
          } />
          <Route path="/analytics" element={
            user && (user.role === 'admin' || user.role === 'manager')
              ? <AnalyticsDashboard user={user} />
              : <Navigate to="/dashboard" />
          } />
          {/* Admin routes */}
          <Route path="/admin/users" element={user?.role === 'admin' ? <ManageUsers user={user} /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/users/add" element={user?.role === 'admin' ? <ManageUsers user={user} /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/approval-flow" element={user?.role === 'admin' ? <ApprovalFlowConfig /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/audit-logs" element={user?.role === 'admin' ? <AuditLogs /> : <Navigate to="/dashboard" />} />
          <Route path="/admin/fraud-alerts" element={user?.role === 'admin' ? <FraudAlerts /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
