import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Trash2, Save, X, Shield, Briefcase } from 'lucide-react';
import { usersAPI } from '../../services/api';

const DEPARTMENTS = ['engineering', 'finance', 'hr', 'marketing', 'operations', 'sales', 'general'];
const DESIGNATIONS = ['employee', 'manager', 'senior_manager', 'director', 'vp', 'cfo', 'ceo'];
const ROLES = ['admin', 'manager', 'employee'];

const ManageUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', password: 'password123',
    role: 'employee', department: 'general', designation: 'employee',
    managerId: '', isManagerApprover: false, budgetLimit: 0, phone: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [usersRes, managersRes] = await Promise.all([
        usersAPI.getUsers(),
        usersAPI.getManagers()
      ]);
      setUsers(usersRes.data);
      setManagers(managersRes.data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await usersAPI.createUser(formData);
      setSuccess('User created successfully!');
      setFormData({ name: '', email: '', password: 'password123', role: 'employee', department: 'general', designation: 'employee', managerId: '', isManagerApprover: false, budgetLimit: 0, phone: '' });
      fetchData();
      setTimeout(() => setActiveTab('list'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const startEdit = (u) => {
    setEditingId(u._id);
    setEditData({
      name: u.name, role: u.role, department: u.department || 'general',
      designation: u.designation || 'employee', managerId: u.managerId?._id || '',
      isManagerApprover: u.isManagerApprover, budgetLimit: u.budgetLimit || 0, phone: u.phone || ''
    });
  };

  const handleUpdate = async (id) => {
    setError('');
    try {
      await usersAPI.updateUser(id, editData);
      setEditingId(null);
      setSuccess('User updated!');
      fetchData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await usersAPI.deleteUser(id);
      setSuccess('User deleted');
      fetchData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role) => {
    const colors = { admin: 'bg-purple-100 text-purple-800', manager: 'bg-blue-100 text-blue-800', employee: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role] || colors.employee}`}>{role}</span>;
  };

  const getDesignationBadge = (des) => {
    const colors = { cfo: 'bg-amber-100 text-amber-800', ceo: 'bg-red-100 text-red-800', director: 'bg-indigo-100 text-indigo-800', vp: 'bg-teal-100 text-teal-800' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[des] || 'bg-gray-50 text-gray-600'}`}>{des?.replace('_', ' ')}</span>;
  };

  if (loading) return <div className="max-w-7xl mx-auto py-6 px-4 text-center">Loading users...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-600">Manage employees, assign managers, set roles & designations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              <Users className="h-4 w-4 inline mr-1" /> All Users ({users.length})
            </button>
            <button onClick={() => setActiveTab('add')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'add' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
              <UserPlus className="h-4 w-4 inline mr-1" /> Add User
            </button>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error} <button onClick={() => setError('')} className="float-right font-bold">×</button></div>}
        {success && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{success}</div>}

        {/* ── USER LIST TAB ── */}
        {activeTab === 'list' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reports To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    {editingId === u._id ? (
                      /* EDIT MODE */
                      <>
                        <td className="px-4 py-3">
                          <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                            className="w-full border rounded px-2 py-1 text-sm" />
                          <div className="text-xs text-gray-400 mt-1">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}
                            className="border rounded px-2 py-1 text-sm">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })}
                            className="border rounded px-2 py-1 text-sm">
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select value={editData.designation} onChange={e => setEditData({ ...editData, designation: e.target.value })}
                            className="border rounded px-2 py-1 text-sm">
                            {DESIGNATIONS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select value={editData.managerId} onChange={e => setEditData({ ...editData, managerId: e.target.value })}
                            className="border rounded px-2 py-1 text-sm">
                            <option value="">None</option>
                            {managers.filter(m => m._id !== u._id).map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" value={editData.budgetLimit} onChange={e => setEditData({ ...editData, budgetLimit: parseInt(e.target.value) || 0 })}
                            className="w-20 border rounded px-2 py-1 text-sm" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleUpdate(u._id)} className="text-green-600 hover:text-green-800 mr-2"><Save className="h-4 w-4 inline" /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="h-4 w-4 inline" /></button>
                        </td>
                      </>
                    ) : (
                      /* VIEW MODE */
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-indigo-600">{u.name?.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{u.department || 'general'}</td>
                        <td className="px-4 py-3">{getDesignationBadge(u.designation)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.managerId ? u.managerId.name : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.budgetLimit > 0 ? `₹${u.budgetLimit.toLocaleString()}` : <span className="text-gray-400">No limit</span>}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(u)} className="text-indigo-600 hover:text-indigo-800 mr-2"><Edit2 className="h-4 w-4 inline" /></button>
                          {u._id !== user.id && <button onClick={() => handleDelete(u._id, u.name)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 inline" /></button>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ADD USER TAB ── */}
        {activeTab === 'add' && (
          <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-indigo-600" /> Add New User
            </h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="john@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Shield className="h-4 w-4 inline mr-1" /> System Role *
                  </label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Controls system permissions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase className="h-4 w-4 inline mr-1" /> Designation *
                  </label>
                  <select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Used for approval chain routing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                  <select value={formData.managerId} onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">— None —</option>
                    {managers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.department})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Budget Limit (₹)</label>
                  <input type="number" value={formData.budgetLimit} onChange={e => setFormData({ ...formData, budgetLimit: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="0 = No limit" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="+91 98765 43210" />
                </div>
              </div>

              {formData.role === 'manager' && (
                <div className="flex items-center mt-2">
                  <input type="checkbox" id="isManagerApprover" checked={formData.isManagerApprover}
                    onChange={e => setFormData({ ...formData, isManagerApprover: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                  <label htmlFor="isManagerApprover" className="ml-2 text-sm text-gray-700">Can approve expenses (Manager Approver)</label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setActiveTab('list')} className="px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Create User</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;