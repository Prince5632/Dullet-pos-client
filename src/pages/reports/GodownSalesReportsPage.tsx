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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Godown-wise sales performance</p>
        </div>
        <button onClick={exportToCSV} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link to="/reports/sales-executives" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5" />
            Sales Executives
          </Link>
          <Link to="/reports/customers" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Customers
          </Link>
          <Link to="/reports/godowns" className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5" />
            Godowns
          </Link>
        </nav>
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
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


