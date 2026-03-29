import React from 'react';

const ApprovalFunnel = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded flex-1"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stages = [
    { key: 'submitted', label: 'Submitted', color: 'bg-blue-500' },
    { key: 'managerApproved', label: 'Manager Approved', color: 'bg-yellow-500' },
    { key: 'financeApproved', label: 'Finance Approved', color: 'bg-green-500' },
    { key: 'finalApproved', label: 'Final Approved', color: 'bg-emerald-500' }
  ];

  const maxValue = Math.max(...stages.map(stage => data[stage.key] || 0));

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const value = data[stage.key] || 0;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const conversionRate = index > 0 ? 
          ((value / (data[stages[index - 1].key] || 1)) * 100).toFixed(1) : 
          '100.0';

        return (
          <div key={stage.key} className="flex items-center space-x-4">
            <div className="w-32 text-sm font-medium text-gray-700">
              {stage.label}
            </div>
            <div className="flex-1 relative">
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className={`${stage.color} h-8 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {value}
                </span>
              </div>
            </div>
            <div className="w-16 text-sm text-gray-600 text-right">
              {index > 0 && `${conversionRate}%`}
            </div>
          </div>
        );
      })}
      
      {/* Rejected expenses */}
      <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
        <div className="w-32 text-sm font-medium text-gray-700">
          Rejected
        </div>
        <div className="flex-1 relative">
          <div className="w-full bg-gray-200 rounded-full h-8">
            <div
              className="bg-red-500 h-8 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${maxValue > 0 ? ((data.rejected || 0) / maxValue) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {data.rejected || 0}
            </span>
          </div>
        </div>
        <div className="w-16 text-sm text-gray-600 text-right">
          {data.submitted > 0 ? `${(((data.rejected || 0) / data.submitted) * 100).toFixed(1)}%` : '0%'}
        </div>
      </div>
    </div>
  );
};

export default ApprovalFunnel;

