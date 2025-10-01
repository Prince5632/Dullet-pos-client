import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomerPurchaseDetail } from '../../services/reportService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils';

const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDetail = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const detail = await getCustomerPurchaseDetail(customerId, params);
      setData(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [customerId]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="text-gray-600">No data found.</div>;

  const { customer, metrics, productInsights, monthlyTrend, recentOrders, daysSinceLastOrder } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.businessName}</h1>
          <p className="text-sm text-gray-500">{customer.customerId} · {customer.contactPerson} · {customer.phone}</p>
        </div>
        <Link to="/reports/customers" className="text-sm text-blue-600 hover:underline">Back to list</Link>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"/>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"/>
          </div>
          <button onClick={fetchDetail} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Apply</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(metrics.totalSpent)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Avg Order</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{formatCurrency(metrics.avgOrderValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Days Since Last Order</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{daysSinceLastOrder ?? 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3">Top Products</h3>
          <div className="divide-y">
            {productInsights.map((p: any) => (
              <div key={p._id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p._id}</div>
                  <div className="text-xs text-gray-500">Orders: {p.orderCount}</div>
                </div>
                <div className="font-semibold text-green-600">{formatCurrency(p.totalAmount)}</div>
              </div>
            ))}
            {productInsights.length === 0 && <div className="text-sm text-gray-500">No data</div>}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3">Monthly Trend (last 12)</h3>
          <div className="space-y-2">
            {monthlyTrend.map((m: any) => (
              <div key={`${m._id.year}-${m._id.month}`} className="flex items-center justify-between text-sm">
                <div>{m._id.month}/{m._id.year}</div>
                <div className="text-gray-700">Orders: {m.orders}</div>
                <div className="font-medium text-green-600">{formatCurrency(m.spent)}</div>
              </div>
            ))}
            {monthlyTrend.length === 0 && <div className="text-sm text-gray-500">No data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Order No</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Sales By</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.map((o: any) => (
                <tr key={o._id}>
                  <td className="px-3 py-2">{o.orderNumber}</td>
                  <td className="px-3 py-2">{formatDate(o.orderDate)}</td>
                  <td className="px-3 py-2">{o.createdBy?.firstName} {o.createdBy?.lastName}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td className="px-3 py-2 text-gray-500" colSpan={4}>No orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;


