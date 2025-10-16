import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getGodownSalesReports } from '../../services/reportService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Table from '../../components/ui/Table';
import { formatCurrency } from '../../utils';

const GodownSalesReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('totalRevenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Quick date filter helper functions
  const getQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const getQuickDateRangeMonth = (months: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const getQuickDateRangeYear = (years: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - years);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const handleQuickFilter = (type: 'days' | 'months' | 'years', value: number) => {
    const filterKey = `${type}-${value}`;
    
    // If the same filter is clicked again, deactivate it
    if (activeQuickFilter === filterKey) {
      setActiveQuickFilter(null);
      setStartDate('');
      setEndDate('');
      
      // Trigger report fetch with cleared dates
      setTimeout(() => {
        fetchReports();
      }, 100);
      return;
    }
    
    let dateRange;
    
    if (type === 'days') {
      dateRange = getQuickDateRange(value);
    } else if (type === 'months') {
      dateRange = getQuickDateRangeMonth(value);
    } else {
      dateRange = getQuickDateRangeYear(value);
    }
    
    setActiveQuickFilter(filterKey);
    setStartDate(dateRange.startDate);
    setEndDate(dateRange.endDate);
    
    // Trigger report fetch with new dates
    setTimeout(() => {
      fetchReports();
    }, 100);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: any = { sortBy, sortOrder };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await getGodownSalesReports(params);
      setReportData(data);
    } catch (e) {
      console.error('Error fetching godown sales reports', e);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData?.reports) return;
    const headers = [
      'Godown',
      'City',
      'Area',
      'Total Orders',
      'Total Revenue',
      'Total Outstanding',
      'Avg Order Value',
    ];
    const rows = reportData.reports.map((r: any) => [
      r.godownName,
      r.location?.city || '',
      r.location?.area || '',
      r.totalOrders,
      r.totalRevenue,
      r.totalOutstanding,
      r.avgOrderValue,
    ]);
    const csv = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `godown-sales-reports-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) return <LoadingSpinner />;

  const summary = reportData?.summary;
  const reports = reportData?.reports || [];

  const columns = [
    {
      key: 'godownName',
      label: 'Godown',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{value || 'Unknown'}</div>
          <div className="text-xs text-gray-500">{row.location?.city}{row.location?.area ? ` · ${row.location.area}` : ''}</div>
        </div>
      ),
    },
    {
      key: 'totalOrders',
      label: 'Orders',
      render: (v: number) => <span className="font-medium text-gray-900">{v}</span>,
    },
    {
      key: 'totalRevenue',
      label: 'Total Revenue',
      render: (v: number) => <span className="font-semibold text-green-600">{formatCurrency(v)}</span>,
    },
    {
      key: 'totalOutstanding',
      label: 'Outstanding',
      render: (v: number) => <span className={`font-medium ${v > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{formatCurrency(v)}</span>,
    },
    {
      key: 'avgOrderValue',
      label: 'Avg Order',
      render: (v: number) => <span className="text-gray-700">{formatCurrency(v)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className='p-3 bg-white'>
      <div className="flex justify-between items-center mb-3">
        <div className="">
        <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Godown Reports</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Track performance insights
                </p>
              </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReports} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Sync
          </button>
          <button onClick={exportToCSV} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Godowns</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalGodowns}</p>
              </div>
              <BuildingOffice2Icon className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalOrdersAll}</p>
              </div>
              <ShoppingBagIcon className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(summary.totalRevenueAll)}</p>
              </div>
              <CurrencyDollarIcon className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{formatCurrency(summary.avgOrderValueAll)}</p>
              </div>
              <BuildingOffice2Icon className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Date Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Quick Date Filters</h3>
        </div>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 0)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-0'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 7)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-7'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 15)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-15'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last 15 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('months', 1)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'months-1'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last Month
            </button>
          </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
          </div>



          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
              <option value="totalRevenue">Total Revenue</option>
              <option value="totalOrders">Total Orders</option>
              <option value="avgOrderValue">Avg Order Value</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Order:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <button onClick={fetchReports} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Apply</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table columns={columns} data={reports} emptyMessage="No godown sales reports found" />
      </div>
    </div>
  );
};

export default GodownSalesReportsPage;


