import React from 'react';

const FiltersPanel = ({ filters, onFilterChange }) => {
  const handleDateChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const handleGroupByChange = (groupBy) => {
    onFilterChange({ groupBy });
  };

  const presetRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 }
  ];

  const applyPresetRange = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    onFilterChange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Preset Ranges */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Quick:</span>
          {presetRanges.map((preset) => (
            <button
              key={preset.days}
              onClick={() => applyPresetRange(preset.days)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Group By */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Group by:</label>
          <select
            value={filters.groupBy}
            onChange={(e) => handleGroupByChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        {/* Current Range Display */}
        <div className="text-sm text-gray-600">
          {new Date(filters.from).toLocaleDateString('en-IN', { 
            month: 'short', 
            day: 'numeric' 
          })} - {new Date(filters.to).toLocaleDateString('en-IN', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
};

export default FiltersPanel;

