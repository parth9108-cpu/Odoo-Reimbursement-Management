import React from 'react';
import { CheckCircle, XCircle, Clock, ChevronRight, Pause } from 'lucide-react';

const ApprovalTimeline = ({ approvers, status }) => {
  if (!approvers || approvers.length === 0) {
    return <div className="text-sm text-gray-400 italic">No approval chain</div>;
  }

  const getStepState = (approver, index) => {
    if (approver.decision === 'approved') return 'approved';
    if (approver.decision === 'rejected') return 'rejected';

    // If pending: is it the current step?
    const previousSteps = approvers.slice(0, index);
    const allPreviousApproved = previousSteps.every(a => a.decision === 'approved');

    if (allPreviousApproved && approver.decision === 'pending') return 'current';
    return 'queued';
  };

  const getStepIcon = (state) => {
    switch (state) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'current': return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      case 'queued': return <Pause className="h-4 w-4 text-gray-300" />;
      default: return <Clock className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStepColors = (state) => {
    switch (state) {
      case 'approved': return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', line: 'bg-green-400' };
      case 'rejected': return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', line: 'bg-red-400' };
      case 'current': return { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', line: 'bg-gray-200' };
      case 'queued': return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-400', line: 'bg-gray-200' };
      default: return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-400', line: 'bg-gray-200' };
    }
  };

  const getStepLabel = (state) => {
    switch (state) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'current': return 'Awaiting Review';
      case 'queued': return 'Queued';
      default: return 'Pending';
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-0">
      {approvers.map((approver, index) => {
        const state = getStepState(approver, index);
        const colors = getStepColors(state);
        const approverUser = approver.userId;
        const name = typeof approverUser === 'object' ? approverUser.name : 'Unknown';
        const role = typeof approverUser === 'object' ? (approverUser.designation?.replace('_', ' ') || approverUser.role) : approver.role;

        return (
          <div key={index}>
            <div className={`flex items-start p-3 rounded-lg border ${colors.bg} transition-all`}>
              <div className="flex-shrink-0 mt-0.5">{getStepIcon(state)}</div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-medium ${colors.text}`}>
                      Step {approver.sequenceStep}: {name}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 capitalize">({role})</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {getStepLabel(state)}
                  </span>
                </div>
                {approver.comment && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{approver.comment}"</p>
                )}
                {approver.decidedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatTime(approver.decidedAt)}</p>
                )}
              </div>
            </div>
            {/* Connector line */}
            {index < approvers.length - 1 && (
              <div className="flex items-center pl-5 py-1">
                <div className={`w-0.5 h-4 ${colors.line} ml-2`}></div>
              </div>
            )}
          </div>
        );
      })}

      {/* Final status */}
      <div className="mt-2 pt-2 border-t border-dashed">
        <div className="flex items-center">
          {status === 'approved' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
          {status === 'rejected' && <XCircle className="h-5 w-5 text-red-600 mr-2" />}
          {(status === 'pending' || status === 'in_progress') && <Clock className="h-5 w-5 text-amber-500 mr-2" />}
          <span className={`text-sm font-semibold capitalize ${
            status === 'approved' ? 'text-green-700' :
            status === 'rejected' ? 'text-red-700' : 'text-amber-600'
          }`}>
            Final Status: {status === 'in_progress' ? 'In Progress' : status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ApprovalTimeline;
