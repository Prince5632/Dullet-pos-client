import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  FunnelIcon, 
  EyeIcon, 
  PencilIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
// import { Table, Pagination, Badge, Avatar } from '../../components/ui';
import type { Order, Customer, TableColumn } from '../../types';
// import { toast } from 'react-hot-toast';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
// import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import OrderStatusDropdown from '../../components/orders/OrderStatusDropdown';

const OrdersPage: React.FC = () => {
  // const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
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
          setTotalOrders((response.pagination as any).totalOrders || 0);
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

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prev => prev.map(order => 
      order._id === updatedOrder._id ? updatedOrder : order
    ));
  };

  // Table columns
  const columns: TableColumn<Order>[] = [
    {
      key: 'orderNumber',
      label: 'Order Details',
      sortable: true,
      render: (_value, order) => (
        <div className="min-w-0 py-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold text-gray-900 text-sm">
              {order.orderNumber}
            </div>
            {order.priority !== 'normal' && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                order.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                order.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {order.priority.toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {orderService.formatDate(order.orderDate)}
          </div>
          <div className="text-xs text-gray-400">
            {Math.ceil((new Date().getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))} days old
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (customer) => (
        <div className="flex items-center space-x-3 min-w-0 py-1">
          <Avatar name={customer?.businessName || 'Customer'} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate text-sm">
              {customer?.businessName || '—'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {customer?.contactPersonName || customer?.customerId}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Order Summary',
      render: (_value, order) => (
        <div className="min-w-0 py-1">
          <div className="font-semibold text-gray-900 text-sm mb-1">
            {orderService.formatCurrency(order.totalAmount)}
          </div>
          <div className="text-xs text-gray-500 mb-1">
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} • {order.paymentTerms}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {order.items?.[0]?.productName}
            {order.items?.length > 1 && ` +${order.items.length - 1} more`}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value, order) => (
        <div className="min-w-0 py-1">
          <div className="mb-2">
            <OrderStatusDropdown
              order={order}
              onOrderUpdate={handleOrderUpdate}
              compact
            />
          </div>
          {/* <div className="flex items-center gap-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              orderService.getPaymentStatusColor(order.paymentStatus)
            }`}>
              {order.paymentStatus === 'pending' ? 'P' :
               order.paymentStatus === 'partial' ? 'PP' :
               order.paymentStatus === 'paid' ? '✓' : 'OD'}
            </span>
            <span className="text-xs text-gray-400">
              {order.paymentStatus}
            </span>
          </div> */}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, order) => (
        <div className="flex items-center justify-end space-x-1 py-1">
          <Link
            to={`/orders/${order._id}`}
            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            to={`/orders/${order._id}/edit`}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage customer orders and track their progress
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {hasPermission('orders.approve') && (
                <Link
                  to="/orders/approval"
                  className="relative inline-flex items-center justify-center px-3 sm:px-4 py-2.5 border border-amber-200 text-sm font-medium rounded-lg shadow-sm text-amber-700 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 touch-manipulation"
                >
                  <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Pending Approval</span>
                  {orders.filter(o => o.status === 'pending').length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800 animate-pulse">
                      {orders.filter(o => o.status === 'pending').length}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to="/orders/new"
                className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md touch-manipulation"
              >
                <PlusIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Create Order</span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Smart Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Search */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by order number, customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                {[
                  { value: 'pending', label: 'Pending', color: 'amber', count: orders.filter(o => o.status === 'pending').length },
                  { value: 'approved', label: 'Approved', color: 'emerald', count: orders.filter(o => o.status === 'approved').length },
                  { value: 'processing', label: 'Production', color: 'blue', count: orders.filter(o => o.status === 'processing').length },
                  { value: 'completed', label: 'Completed', color: 'green', count: orders.filter(o => o.status === 'completed').length }
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setStatusFilter(statusFilter === status.value ? '' : status.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap touch-manipulation ${
                      statusFilter === status.value
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-200 shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 active:bg-gray-300'
                    }`}
                  >
                    <span>{status.label}</span>
                    {status.count > 0 && (
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                        statusFilter === status.value ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {status.count}
                      </span>
                    )}
                  </button>
                ))}
                
                <div className="h-6 w-px bg-gray-300 mx-1" />
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    showFilters
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  <span>Filters</span>
                </button>
                
                {(statusFilter || paymentStatusFilter || customerFilter || dateFromFilter || dateToFilter) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      {orderService.getPaymentStatuses().map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer
                    </label>
                    <select
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">All Customers</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id}>
                          {customer.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">{/* No stacking context */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {loading ? 'Loading...' : `${totalOrders} Order${totalOrders !== 1 ? 's' : ''}`}
                </h3>
                {!loading && totalOrders > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {statusFilter ? `${statusFilter} orders` : 'All orders'}
                  </span>
                )}
              </div>
              
              {!loading && orders.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border">
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap font-medium">
                      Today: {orders.filter(o => new Date(o.orderDate).toDateString() === new Date().toDateString()).length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border">
                    <ClockIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="whitespace-nowrap font-medium">
                      Pending: {orders.filter(o => o.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border">
                    <CurrencyRupeeIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="whitespace-nowrap font-medium">
                      {orderService.formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 font-medium">Loading orders...</span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {statusFilter || searchTerm || customerFilter ? 
                  'Try adjusting your filters to see more orders.' : 
                  'Get started by creating your first order.'}
              </p>
              {!statusFilter && !searchTerm && !customerFilter ? (
                <Link
                  to="/orders/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Order
                </Link>
              ) : (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block lg:hidden">
                <div className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {order.orderNumber}
                            </h3>
                            {order.priority !== 'normal' && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                order.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                order.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar name={order.customer?.businessName || 'Customer'} size="sm" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {order.customer?.businessName || '—'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {orderService.formatDate(order.orderDate)} • {Math.ceil((new Date().getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))} days old
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {orderService.formatCurrency(order.totalAmount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} • {order.paymentTerms}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                orderService.getPaymentStatusColor(order.paymentStatus)
                              }`}>
                                {order.paymentStatus === 'pending' ? 'P' :
                                 order.paymentStatus === 'partial' ? 'PP' :
                                 order.paymentStatus === 'paid' ? '✓' : 'OD'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <OrderStatusDropdown
                                order={order}
                                onOrderUpdate={handleOrderUpdate}
                                compact
                              />
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <Link
                                to={`/orders/${order._id}`}
                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                              <Link
                                to={`/orders/${order._id}/edit`}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                                title="Edit Order"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table
                  columns={columns}
                  data={orders}
                  loading={false}
                  sortBy={sortBy}
                  onSort={handleSort}
                />
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalOrders}
                itemsPerPage={limit}
                onItemsPerPageChange={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
