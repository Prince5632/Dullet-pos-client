import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { getExecutivePerformanceDetail } from '../../services/reportService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils';

const SalesExecutiveDetailPage: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportType = searchParams.get('type') || 'orders';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchDetail = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      // Pass the report type (convert 'orders' to 'order' and 'visits' to 'visit')
      params.type = reportType === 'orders' ? 'order' : 'visit';
      const detail = await getExecutivePerformanceDetail(userId, params);
      console.log('Executive Detail Data:', detail);
      console.log('Recent Orders:', detail?.recentOrders);
      if (detail?.recentOrders?.length > 0) {
        console.log('First order attaKg:', detail.recentOrders[0].attaKg);
        console.log('First order items:', detail.recentOrders[0].items);
      }
      setData(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [userId]);

  const handleApplyFilters = () => {
    fetchDetail();
    setShowFilters(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
          <p className="text-gray-500 mb-4">Unable to load executive details</p>
          <button
            onClick={() => navigate('/reports/sales-executives')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const { executive, metrics, monthlyTrend, topCustomers, recentOrders, attaSummary } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/reports/sales-executives')}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {executive.name} - {reportType === 'visits' ? 'Visit' : 'Order'} Details
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {executive.employeeId} • {executive.department} • {executive.position}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Filter Toggle Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {(startDate || endDate) && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                !
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Date Range</span>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleApplyFilters}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Metrics Cards - Mobile Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{reportType === 'visits' ? 'Visits' : 'Orders'}</p>
              <ShoppingBagIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{metrics.totalOrders}</p>
          </div>
          {reportType === 'orders' ? (
            <>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-xl font-bold text-green-600 truncate">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Avg Order</p>
                  <ChartBarIcon className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-blue-600 truncate">{formatCurrency(metrics.avgOrderValue)}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Max Order</p>
                  <ChartBarIcon className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(metrics.maxOrderValue)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Unique Locations</p>
                  <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-xl font-bold text-green-600 truncate">{metrics.uniqueLocations || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Avg Locations Per Day</p>
                  <ChartBarIcon className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-blue-600 truncate">{metrics.avgLocationsPerDay || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Today</p>
                  <ChartBarIcon className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-purple-600 truncate">{metrics.totalVisitsToday || 0}</p>
              </div>
            </>
          )}
        </div>

        {/* Aata Sales Summary - Only for Orders */}
        {reportType === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Aata Sales Summary</h3>
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 p-2 rounded text-center">
                <p className="text-xs text-gray-500 mb-1">Total KG</p>
                <p className="text-lg font-bold text-gray-900">
                  {attaSummary?.totalKg?.toFixed ? attaSummary.totalKg.toFixed(2) : attaSummary?.totalKg || 0}
                </p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-green-600 mb-1">Amount</p>
                <p className="text-lg font-bold text-green-700 truncate">
                  {formatCurrency(attaSummary?.totalAmount || 0)}
                </p>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-blue-600 mb-1">Avg ₹/Kg</p>
                <p className="text-lg font-bold text-blue-700 truncate">
                  {formatCurrency(attaSummary?.avgPricePerKg || 0)}
                </p>
              </div>
            </div>

            {/* By Grade */}
            <h4 className="text-xs font-semibold text-gray-700 mb-2">By Grade</h4>
            <div className="space-y-2">
              {(attaSummary?.byGrade || []).map((g: any) => (
                <div key={g.grade || 'NA'} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{g.grade || 'Standard'}</div>
                    <div className="text-gray-500">{(g.kg || 0).toFixed(2)} kg</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-medium text-green-600">{formatCurrency(g.amount || 0)}</div>
                    <div className="text-gray-500">{formatCurrency(g.avgPricePerKg || 0)}/kg</div>
                  </div>
                </div>
              ))}
              {(!attaSummary || (attaSummary.byGrade || []).length === 0) && (
                <div className="text-xs text-gray-500 text-center py-4">No Aata items found</div>
              )}
            </div>
          </div>
        )}

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {reportType === 'visits' ? 'Top Locations' : 'Top Customers'}
          </h3>
          <div className="space-y-2">
            {topCustomers.map((c: any) => (
              <div key={c._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {c.customerInfo?.businessName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {reportType === 'visits' ? `Visits: ${c.totalOrders}` : `Orders: ${c.totalOrders}`}
                  </div>
                </div>
                <div className="text-sm font-semibold text-green-600 flex-shrink-0 ml-2">
                  {reportType === 'visits' ? `${c.totalOrders} visits` : formatCurrency(c.totalSpent)}
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                {reportType === 'visits' ? 'No location data' : 'No customer data'}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly Trend (Last 12)</h3>
          <div className="space-y-2">
            {monthlyTrend.map((m: any) => (
              <div key={`${m._id.year}-${m._id.month}`} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700 w-16">{m._id.month}/{m._id.year}</div>
                <div className="text-gray-600">
                  {reportType === 'visits' ? `Visits: ${m.orders}` : `Orders: ${m.orders}`}
                </div>
                <div className="font-medium text-green-600 flex-shrink-0 ml-2">
                  {reportType === 'visits' ? `${m.orders} visits` : formatCurrency(m.revenue)}
                </div>
              </div>
            ))}
            {monthlyTrend.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">No trend data</div>
            )}
          </div>
        </div>

        {/* Recent Orders/Visits - Mobile Cards */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {reportType === 'visits' ? 'Recent Visits' : 'Recent Orders'}
          </h3>
          
          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-3">
            {recentOrders.map((o: any) => (
              <div key={o._id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{o.orderNumber}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatDate(o.orderDate)}</div>
                    <div className="text-xs text-gray-600 mt-1 truncate">
                      {o.customer?.businessName}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {reportType === 'orders' ? (
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(o.totalAmount)}
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-blue-600">
                        {o.status || 'Pending'}
                      </div>
                    )}
                  </div>
                </div>
                {reportType === 'orders' && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">Aata KG</div>
                    <div className="text-xs font-medium text-gray-900">
                      {(o.attaKg ?? 0).toFixed(2)} kg
                    </div>
                  </div>
                )}
                {reportType === 'visits' && (
                  <div className="flex items-center flex-wrap justify-between pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">Purpose</div>
                    <div className="text-xs font-medium text-gray-900">
                      {o.notes || 'General Visit'}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-8">
                {reportType === 'visits' ? 'No recent visits' : 'No recent orders'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                    {reportType === 'visits' ? 'Visit No' : 'Order No'}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                    {reportType === 'visits' ? 'Location' : 'Customer'}
                  </th>
                  {reportType === 'orders' ? (
                    <>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Aata KG</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Notes</th>
                      {/* <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Status</th> */}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((o: any) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{o.orderNumber}</td>
                    <td className="px-3 py-2 text-sm">{formatDate(o.orderDate)}</td>
                    <td className="px-3 py-2 text-sm">{o.customer?.businessName}</td>
                    {reportType === 'orders' ? (
                      <>
                        <td className="px-3 py-2 text-right text-sm">{(o.attaKg ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-green-600">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm">{o?.notes || 'General Visit'}</td>
                        {/* <td className="px-3 py-2 text-right text-sm font-medium text-blue-600">
                          {o.status || 'Pending'}
                        </td> */}
                      </>
                    )}
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-gray-500" colSpan={5}>
                      {reportType === 'visits' ? 'No recent visits' : 'No recent orders'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesExecutiveDetailPage;
