import React from 'react';

const KPICards = ({ kpis, loading }) => {
  console.log('KPICards kpis:', kpis);
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (hours) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      return `${Math.round(hours / 24)}d`;
    }
  };

  // Defensive: extract numbers if values are objects
  const getValue = (val) => {
    if (val && typeof val === 'object') {
      const num = Object.values(val).find(v => typeof v === 'number');
      return num !== undefined ? num : 0;
    }
    return val;
  };

  const cards = [
    {
      title: 'Total Spend',
      value: formatCurrency(getValue(kpis.totalSpend)),
      subtitle: 'Last 30 days',
      icon: '💰',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Pending Approvals',
      value: getValue(kpis.pendingApprovals),
      subtitle: 'Awaiting review',
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Avg Approval Time',
      value: formatTime(getValue(kpis.avgApprovalTime)),
      subtitle: 'Time to approve',
      icon: '⏱️',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Auto-Approved',
      value: `${getValue(kpis.autoApprovedPercentage)}%`,
      subtitle: 'Via conditional rules',
      icon: '🤖',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg shadow-sm border ${card.borderColor} p-6 hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>
            <div className={`${card.bgColor} rounded-full p-3`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;

