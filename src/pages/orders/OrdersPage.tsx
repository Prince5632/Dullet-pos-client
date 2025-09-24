import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  FunnelIcon, 
  EyeIcon, 
  PencilIcon,
  CalendarIcon,
  UserIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';
import { useDebounce } from '../../hooks/useDebounce';
// import { Table, Pagination, Badge, Avatar } from '../../components/ui';
import type { Order, Customer, TableColumn } from '../../types';
import { toast } from 'react-hot-toast';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit] = useState(10);
  
  // Sorting
  const [sortBy, setSortBy] = useState('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load data
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit,
        search: debouncedSearchTerm,
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        customerId: customerFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        sortBy,
        sortOrder,
      };

      const response = await orderService.getOrders(params);
      
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        if (response.pagination) {
          setCurrentPage(response.pagination.currentPage || 1);
          setTotalPages(response.pagination.totalPages || 1);
          setTotalOrders(response.pagination.totalOrders || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    limit,
    debouncedSearchTerm,
    statusFilter,
    paymentStatusFilter,
    customerFilter,
    dateFromFilter,
    dateToFilter,
    sortBy,
    sortOrder,
  ]);

  const loadCustomers = useCallback(async () => {
    try {
      const customerList = await customerService.getAllCustomers();
      setCustomers(customerList);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, statusFilter, paymentStatusFilter, customerFilter, dateFromFilter, dateToFilter, currentPage]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };


  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setCustomerFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setCurrentPage(1);
  };

  // Table columns
  const columns: TableColumn<Order>[] = [
    {
      key: 'orderNumber',
      label: 'Order Number',
      sortable: true,
      render: (_value, order) => (
        <div className="font-medium text-gray-900">
          {order.orderNumber}
          <div className="text-xs text-gray-500">
            {orderService.formatDate(order.orderDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (customer, order) => (
        <div className="flex items-center space-x-3">
          <Avatar name={customer?.businessName || 'Customer'} size="sm" />
          <div>
            <div className="font-medium text-gray-900 truncate max-w-48">
              {customer?.businessName || '—'}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-48">
              {[customer?.customerId, customer?.contactPersonName].filter(Boolean).join(' • ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (_value, order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500">
            {order.items?.slice(0, 2).map((item, index) => (
              <div key={index}>
                {item.productName} ({item.quantity} {item.unit})
              </div>
            ))}
            {(order.items?.length || 0) > 2 && (
              <div className="text-blue-600">+{order.items.length - 2} more</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      render: (_value, order) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {orderService.formatCurrency(order.totalAmount)}
          </div>
          <div className="text-xs text-gray-500">
            {order.paymentTerms}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value, order) => (
        <div className="space-y-1">
          <Badge
            text={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            variant="custom"
            className={orderService.getStatusColor(order.status)}
            size="sm"
          />
          <Badge
            text={order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
            variant="custom"
            className={orderService.getPaymentStatusColor(order.paymentStatus)}
            size="sm"
          />
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (_value, order) => (
        <Badge
          text={order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
          variant="custom"
          className={orderService.getPriorityColor(order.priority)}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, order) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/orders/${order._id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            to={`/orders/${order._id}/edit`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit Order"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Orders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage customer orders and track their progress
              </p>
            </div>
            <Link
              to="/orders/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Order
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Search orders by order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
                    showFilters
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
                {(statusFilter || paymentStatusFilter || customerFilter || dateFromFilter || dateToFilter) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {orderService.getOrderStatuses().map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {orderService.getPaymentStatuses().map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.businessName} ({customer.customerId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {totalOrders} Orders
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Today: {orders.filter(o => new Date(o.orderDate).toDateString() === new Date().toDateString()).length}
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  Pending: {orders.filter(o => o.status === 'pending').length}
                </div>
                <div className="flex items-center">
                  <CurrencyRupeeIcon className="h-4 w-4 mr-1" />
                  Total: {orderService.formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                </div>
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            data={orders}
            loading={loading}
            sortBy={sortBy}
            onSort={handleSort}
            emptyMessage="No orders found"
            emptyDescription="Get started by creating your first order"
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalOrders}
                itemsPerPage={limit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
