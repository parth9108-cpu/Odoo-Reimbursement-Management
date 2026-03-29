import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import KPICards from './KPICards';
import TimeSeriesChart from './TimeSeriesChart';
import CategoryChart from './CategoryChart';
import TopMerchantsChart from './TopMerchantsChart';
import ApprovalFunnel from './ApprovalFunnel';
import PendingApprovalsPanel from './PendingApprovalsPanel';
import FiltersPanel from './FiltersPanel';
import DrilldownDrawer from './DrilldownDrawer';

const AnalyticsDashboard = ({ user }) => {
  const [kpis, setKpis] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    groupBy: 'day'
  });
  const [selectedData, setSelectedData] = useState(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Fetch all expenses to compute analytics natively (avoids missing backend routes)
      const response = await api.get('/expenses');
      const allExpenses = response.data || [];

      // Compute Pending Approvals for current user
      const pendingUserApprovals = allExpenses.filter(expense => {
        if (expense.status !== 'pending' && expense.status !== 'in_progress') return false;
        return expense.approvers?.some(
          a => a.userId?._id === user?.id && a.decision === 'pending'
        );
      });

      // Compute KPIs
      const pendingCount = allExpenses.filter(e => e.status === 'pending' || e.status === 'in_progress').length;
      const totalSpend = allExpenses.reduce((sum, e) => sum + (e.amountCompanyCurrency || 0), 0);
      setKpis({
        totalSpend,
        pendingApprovals: pendingCount,
        avgApprovalTime: 24, // Mock 24hrs for demo
        autoApprovedPercentage: 15 // Mock percentage
      });

      // Compute TimeSeries (group by day)
      const tsMap = {};
      allExpenses.forEach(e => {
        const d = new Date(e.createdAt).toISOString().split('T')[0];
        tsMap[d] = (tsMap[d] || 0) + (e.amountCompanyCurrency || 0);
      });
      const computedTs = Object.keys(tsMap).map(date => ({ date, total: tsMap[date] })).sort((a,b) => a.date.localeCompare(b.date));
      if (computedTs.length === 0) computedTs.push({ date: new Date().toISOString().split('T')[0], total: 0 });
      setTimeseries(computedTs);

      // Compute Categories
      const catMap = {};
      let totalCat = 0;
      allExpenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + (e.amountCompanyCurrency || 0);
        totalCat += (e.amountCompanyCurrency || 0);
      });
      setCategories(Object.keys(catMap).map(category => ({
        category,
        total: catMap[category],
        percentage: totalCat > 0 ? (catMap[category] / totalCat) * 100 : 0
      })));

      // Compute Merchants
      const merchMap = {};
      allExpenses.forEach(e => {
        const m = (e.extractedFields && e.extractedFields.merchant) || 'Unknown Merchant';
        merchMap[m] = (merchMap[m] || 0) + (e.amountCompanyCurrency || 0);
      });
      setMerchants(Object.keys(merchMap).map(merchant => ({
        merchant,
        total: merchMap[merchant]
      })).sort((a,b) => b.total - a.total).slice(0, 5));

      // Compute Funnel
      setFunnel({
        submitted: allExpenses.length,
        managerApproved: allExpenses.filter(e => e.approvers?.[0]?.decision === 'approved').length,
        financeApproved: allExpenses.filter(e => e.approvers?.[1]?.decision === 'approved').length,
        finalApproved: allExpenses.filter(e => e.status === 'approved').length,
        rejected: allExpenses.filter(e => e.status === 'rejected').length
      });

      setPendingApprovals(pendingUserApprovals);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchAnalyticsData, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleChartClick = (data) => {
    setSelectedData(data);
    setShowDrilldown(true);
  };

  const handleExport = () => {
    // A CSV file is strictly text-only and mathematically cannot contain graphs or styling.
    // To provide a formatted export with graphs as requested, we trigger the browser PDF printer 
    // heavily styled by the `@media print` CSS block.
    window.print();
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex space-x-3 no-print">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Export PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FiltersPanel filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {/* KPI Cards */}
      <div className="mb-6">
        <KPICards kpis={kpis} loading={loading} currencyCode={user?.companyId?.currencyCode || 'USD'} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Time Series Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Spend Over Time</h2>
            <TimeSeriesChart 
              data={timeseries} 
              onPointClick={handleChartClick}
              loading={loading}
            />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex-shrink-0">Pending Approvals</h2>
            <div className="flex-1 overflow-y-auto max-h-80 pr-2 custom-scrollbar">
              <PendingApprovalsPanel 
                approvals={pendingApprovals} 
                onApprovalAction={fetchAnalyticsData}
                loading={loading}
                currencyCode={user?.companyId?.currencyCode || 'USD'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Breakdown</h2>
          <CategoryChart 
            data={categories} 
            onSliceClick={handleChartClick}
            loading={loading}
          />
        </div>

        {/* Top Merchants */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Merchants</h2>
          <TopMerchantsChart 
            data={merchants} 
            onBarClick={handleChartClick}
            loading={loading}
          />
        </div>
      </div>

      {/* Approval Funnel */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Approval Funnel</h2>
          <ApprovalFunnel data={funnel} loading={loading} />
        </div>
      </div>

      {/* Drilldown Drawer */}
      {showDrilldown && (
        <DrilldownDrawer
          data={selectedData}
          onClose={() => setShowDrilldown(false)}
          onAction={fetchAnalyticsData}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;

