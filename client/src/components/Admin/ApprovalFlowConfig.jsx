import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { companyAPI } from '../../services/api';

const MATCH_TYPES = [
  { value: 'manager', label: 'Reporting Manager', desc: 'Employee\'s assigned manager' },
  { value: 'department', label: 'Department', desc: 'User in specific department' },
  { value: 'designation', label: 'Designation', desc: 'User with specific title' },
];

const DEPARTMENTS = ['engineering', 'finance', 'hr', 'marketing', 'operations', 'sales', 'general'];
const DESIGNATIONS = ['employee', 'manager', 'senior_manager', 'director', 'vp', 'cfo', 'ceo'];

const ApprovalFlowConfig = () => {
  const [sequences, setSequences] = useState([]);
  const [conditionalRules, setConditionalRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    try {
      const res = await companyAPI.getApprovalRules();
      setSequences(res.data.approvalSequences || []);
      setConditionalRules(res.data.conditionalRules || []);
    } catch (err) {
      setError('Failed to load approval rules');
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSequences([...sequences, {
      name: '', matchType: 'manager', department: '', designation: '',
      sequenceStep: sequences.length + 1
    }]);
  };

  const removeStep = (index) => {
    const updated = sequences.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequenceStep: i + 1 }));
    setSequences(updated);
  };

  const updateStep = (index, field, value) => {
    const updated = [...sequences];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-set name
    if (field === 'matchType') {
      if (value === 'manager') updated[index].name = 'Reporting Manager';
      else if (value === 'department') updated[index].name = `${updated[index].department || 'Finance'} Department`;
      else if (value === 'designation') updated[index].name = updated[index].designation || 'Director';
    }
    if (field === 'department') updated[index].name = `${value} Department`;
    if (field === 'designation' && updated[index].matchType === 'designation') updated[index].name = value;
    setSequences(updated);
  };

  const addRule = () => {
    setConditionalRules([...conditionalRules, { type: 'percentage', threshold: 0.6, approverDesignation: 'cfo', cfoOverride: false }]);
  };

  const removeRule = (index) => {
    setConditionalRules(conditionalRules.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    const updated = [...conditionalRules];
    updated[index] = { ...updated[index], [field]: value };
    setConditionalRules(updated);
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await companyAPI.updateApprovalRules({ approvalSequences: sequences, conditionalRules });
      setSuccess('Approval rules saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto py-6 px-4 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="h-8 w-8 mr-3 text-indigo-600" /> Approval Flow Configuration
          </h1>
          <p className="mt-1 text-gray-600">Define the multi-level approval chain and conditional auto-approval rules</p>
        </div>

        {error && <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
        {success && <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{success}</div>}

        {/* ── APPROVAL SEQUENCE ── */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sequential Approval Chain</h2>
            <button onClick={addStep} className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-1" /> Add Step
            </button>
          </div>

          {/* Visual preview */}
          {sequences.length > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
              <div className="text-xs font-medium text-indigo-600 mb-2">APPROVAL FLOW PREVIEW</div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Employee Submits</span>
                {sequences.map((step, i) => (
                  <React.Fragment key={i}>
                    <ArrowRight className="h-4 w-4 text-indigo-400" />
                    <span className="px-3 py-1 bg-white border border-indigo-200 rounded-full text-sm font-medium text-indigo-700">
                      Step {step.sequenceStep}: {step.name || step.matchType}
                    </span>
                  </React.Fragment>
                ))}
                <ArrowRight className="h-4 w-4 text-green-400" />
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">✅ Approved</span>
              </div>
            </div>
          )}

          {/* Step editor */}
          <div className="space-y-4">
            {sequences.map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {step.sequenceStep}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Match Type</label>
                    <select value={step.matchType} onChange={e => updateStep(index, 'matchType', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm">
                      {MATCH_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">{MATCH_TYPES.find(m => m.value === step.matchType)?.desc}</p>
                  </div>

                  {step.matchType === 'department' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                      <select value={step.department || ''} onChange={e => updateStep(index, 'department', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}

                  {step.matchType === 'designation' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
                      <select value={step.designation || ''} onChange={e => updateStep(index, 'designation', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Step Name</label>
                    <input value={step.name || ''} onChange={e => updateStep(index, 'name', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm" placeholder="e.g. Manager Review" />
                  </div>
                </div>
                <button onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700 mt-6">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONDITIONAL RULES ── */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-amber-500" /> Conditional Auto-Approval Rules
            </h2>
            <button onClick={addRule} className="flex items-center px-3 py-1.5 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600">
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </button>
          </div>

          <div className="space-y-4">
            {conditionalRules.map((rule, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rule Type</label>
                    <select value={rule.type} onChange={e => updateRule(index, 'type', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="percentage">Percentage Threshold</option>
                      <option value="specific">Specific Approver Override</option>
                      <option value="hybrid">Hybrid (Either Condition)</option>
                    </select>
                  </div>

                  {(rule.type === 'percentage' || rule.type === 'hybrid') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Threshold: {Math.round((rule.threshold || 0.6) * 100)}%</label>
                      <input type="range" min="0.1" max="1" step="0.1" value={rule.threshold || 0.6}
                        onChange={e => updateRule(index, 'threshold', parseFloat(e.target.value))}
                        className="w-full" />
                      <p className="text-xs text-gray-400">If {Math.round((rule.threshold || 0.6) * 100)}% approvers approve → auto-approve</p>
                    </div>
                  )}

                  {(rule.type === 'specific' || rule.type === 'hybrid') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Override Designation</label>
                      <select value={rule.approverDesignation || 'cfo'} onChange={e => updateRule(index, 'approverDesignation', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm">
                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d.replace('_', ' ').toUpperCase()}</option>)}
                      </select>
                      <div className="flex items-center mt-2">
                        <input type="checkbox" checked={rule.cfoOverride || false}
                          onChange={e => updateRule(index, 'cfoOverride', e.target.checked)}
                          className="h-4 w-4 text-amber-600 border-gray-300 rounded" />
                        <label className="ml-2 text-xs text-gray-600">Enable override (auto-approve on this approver's approval)</label>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => removeRule(index)} className="text-red-500 hover:text-red-700 mt-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50">
            <Save className="h-5 w-5 mr-2" /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalFlowConfig;
