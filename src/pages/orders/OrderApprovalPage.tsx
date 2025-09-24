import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClockIcon,
  FunnelIcon, 
  EyeIcon,
  CalendarIcon,
  UserIcon,
  CurrencyRupeeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import OrderApprovalActions from '../../components/orders/OrderApprovalActions';
import type { Order, Customer, TableColumn } from '../../types';
import { toast } from 'react-hot-toast';

const OrderApprovalPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
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

  // Check permissions
  const canApprove = hasPermission('orders.approve');

  // Load data
  const loadPendingOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit,
        search: debouncedSearchTerm,
        customerId: customerFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        sortBy,
        sortOrder,
      };

      const response = await orderService.getPendingOrdersForApproval(params);
      
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        if (response.pagination) {
          setCurrentPage(response.pagination.currentPage || 1);
          setTotalPages(response.pagination.totalPages || 1);
          setTotalOrders(response.pagination.totalOrders || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load pending orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending orders');
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    limit,
    debouncedSearchTerm,
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
    if (canApprove) {
      loadPendingOrders();
    } else {
      setError('You do not have permission to view pending orders for approval');
      setLoading(false);
    }
  }, [loadPendingOrders, canApprove]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, customerFilter, dateFromFilter, dateToFilter, currentPage]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    // Remove from pending list if status changed
    if (updatedOrder.status !== 'pending') {
      setOrders(prev => prev.filter(order => order._id !== updatedOrder._id));
      setTotalOrders(prev => prev - 1);
    } else {
      // Update in place if still pending
      setOrders(prev => prev.map(order => 
        order._id === updatedOrder._id ? updatedOrder : order
      ));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCustomerFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setCurrentPage(1);
  };

  // Quick approval actions
  const handleQuickApprove = async (order: Order) => {
    try {
      const updatedOrder = await orderService.approveOrder(order._id);
      handleOrderUpdate(updatedOrder);
      toast.success(`Order ${order.orderNumber} approved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve order';
      toast.error(message);
    }
  };

  const handleQuickReject = async (order: Order) => {
    try {
      const updatedOrder = await orderService.rejectOrder(order._id, 'Quick rejection');
      handleOrderUpdate(updatedOrder);
      toast.success(`Order ${order.orderNumber} rejected`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject order';
      toast.error(message);
    }
  };

  // Table columns
  const columns: TableColumn<Order>[] = [
    {
      key: 'orderNumber',
      label: 'Order Details',
      sortable: true,
      render: (_value, order) => (
        <div className="font-medium text-gray-900">
          <div className="font-semibold">{order.orderNumber}</div>
          <div className="text-xs text-gray-500">
            {orderService.formatDate(order.orderDate)}
          </div>
          <div className="text-xs text-gray-500">
            Age: {Math.ceil((new Date().getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))} days
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
      label: 'Order Summary',
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
      label: 'Amount & Terms',
      sortable: true,
      render: (_value, order) => (
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {orderService.formatCurrency(order.totalAmount)}
          </div>
          <div className="text-xs text-gray-500">
            {order.paymentTerms}
          </div>
          <Badge
            text={order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
            variant="custom"
            className={orderService.getPriorityColor(order.priority)}
            size="sm"
          />
        </div>
      ),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (createdBy, order) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {createdBy?.firstName} {createdBy?.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {orderService.formatDateTime(order.createdAt)}
          </div>
        </div>
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
          {canApprove && (
            <>
              <button
                onClick={() => handleQuickApprove(order)}
                className="text-green-600 hover:text-green-800 p-1"
                title="Quick Approve"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleQuickReject(order)}
                className="text-red-600 hover:text-red-800 p-1"
                title="Quick Reject"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'approval',
      label: 'Approval Actions',
      render: (_value, order) => (
        <OrderApprovalActions
          order={order}
          onOrderUpdate={handleOrderUpdate}
          className="justify-end"
        />
      ),
    },
  ];

  if (!canApprove) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Access Denied</h3>
          <p className="text-gray-600 mb-4">You do not have permission to view pending orders for approval.</p>
          <Link
            to="/orders"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Orders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPendingOrders}
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
              <h1 className="text-2xl font-bold text-gray-900">Order Approval</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve pending orders from sales team
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/orders"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to All Orders
              </Link>
            </div>
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
                {(customerFilter || dateFromFilter || dateToFilter) && (
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
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <ClockIcon className="h-5 w-5 inline mr-2 text-yellow-600" />
                {totalOrders} Pending Orders for Approval
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Today: {orders.filter(o => new Date(o.orderDate).toDateString() === new Date().toDateString()).length}
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  Urgent: {orders.filter(o => o.priority === 'urgent').length}
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
            emptyMessage="No pending orders for approval"
            emptyDescription="All orders have been processed or there are no new orders to review"
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

export default OrderApprovalPage;
