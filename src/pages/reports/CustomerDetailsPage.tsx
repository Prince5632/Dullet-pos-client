import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { customerService } from "../../services/customerService";
import { transactionService } from "../../services/transactionService";
import { orderService } from "../../services/orderService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import { formatCurrency, formatDate, cn } from "../../utils";
import type { Customer, Transaction, Order } from "../../types";
import Modal from "../../components/ui/Modal";
import OrderStatusDropdown from "../../components/orders/OrderStatusDropdown";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const CustomerDetailsPage: React.FC = () => {
  const { customerId: id } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  type TransactionsPagination = {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };

  const [transactionsPagination, setTransactionsPagination] =
    useState<TransactionsPagination>({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page: number = 1) => {
    if (!id) return;
    try {
      setTransactionsLoading(true);
      const response = await transactionService.getCustomerTransactions(id, {
        page,
        limit: transactionsPagination.itemsPerPage,
      });

      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        setTransactionsPagination({
          currentPage: response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages,
          totalItems: response.data.pagination.totalItems,
          itemsPerPage: response.data.pagination.itemsPerPage,
        });
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!id) return;
    try {
      setOrdersLoading(true);
      const ordersData = await orderService.getCustomerOrdersAll(id, {
        sortBy: "orderDate",
        sortOrder: "desc",
      });
      setOrders(ordersData || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchTransactions();
    fetchOrders();
  }, [id]);

  // Open payment modal when outstanding > 0
  const openPaymentModal = () => {
    const outstanding = customer?.netBalance || 0;
    setPaymentAmount(Number(outstanding) || 0);
    setPaymentMode("Cash");
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => setIsPaymentModalOpen(false);

  const handleSubmitPayment = async () => {
    if (!id) return;
    const outstanding = customer?.netBalance || 0;
    if (paymentAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }
    if (paymentAmount > outstanding) {
      toast.error("Amount exceeds outstanding balance.");
      return;
    }
    try {
      setPaymentSubmitting(true);
      const res = await transactionService.allocateCustomerPayment({
        customerId: id,
        amountPaid: paymentAmount,
        paymentMode,
      });
      toast.success("Payment allocated successfully.");
      setIsPaymentModalOpen(false);
      await fetchCustomer();
      await fetchTransactions(transactionsPagination.currentPage);
    } catch (err: any) {
      toast.error(err.message || "Failed to allocate payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const getTransactionModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case "cash":
        return "success";
      case "credit":
        return "warning";
      case "cheque":
        return "info";
      case "online":
        return "info";
      default:
        return "default";
    }
  };

  const getOrderStatusColor = (status: string) => {
    return orderService.getStatusColor(status);
  };

  const getPriorityColor = (priority: string) => {
    return orderService.getPriorityColor(priority);
  };

  const formatOrderItems = (items: any[]) => {
    if (!items || items.length === 0) return "No items";
    const totalItems = items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    return `${totalItems} item${totalItems !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Customer not found
          </h3>
          <p className="text-gray-500">
            The customer you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/reports/customers"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back To Customer Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white  rounded-lg  border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/reports/customers"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back To Customers Report
                </Link>
              </div>
             
            </div>

            {/* Customer Header Info */}
            <div className="mt-6 flex items-center space-x-6">
              <Avatar name={customer.businessName} size="lg" />
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.businessName}
                  </h1>
                  <Badge
                    variant={customer.isActive ? "success" : "error"}
                    size="sm"
                  >
                    {customer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Customer ID: {customer.customerId}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center">
                      <span>•</span>
                      <span className="ml-1">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span>•</span>
                    <span className="ml-1">{customer.customerType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto  py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Business Name
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.businessName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.phone}
                    </p>
                  </div>
                  {customer.alternatePhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Alternate Phone
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.alternatePhone}
                      </p>
                    </div>
                  )}
                  {customer.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.email}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Customer Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.customerType}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Street Address
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.address?.street || "Not provided"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        City
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.city || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        State
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.state || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Pincode
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.pincode || "Not provided"}
                      </p>
                    </div>
                  </div>
                  {customer.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Location
                      </label>
                      <a
                        href={customer.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CurrencyRupeeIcon className="h-5 w-5 mr-2" />
                  Financial Summary
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Net Balance Remaining
                  </span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatCurrency(customer.netBalance || 0)}
                  </span>
                </div>

                {Number(customer.netBalance || 0) > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={openPaymentModal}
                      className="inline-flex cursor-pointer items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white btn-outline text-purple-700 hover:text-white border border-purple-700 hover:bg-purple-800 focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-purple-400 dark:text-purple-400 dark:hover:text-white dark:hover:bg-purple-500 dark:focus:ring-purple-900"
                    >
                      + Add Payment
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Total Orders
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.totalOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Total Order Value
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.totalOrderValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Additional Information
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {customer.gstNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      GST Number
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.gstNumber}
                    </p>
                  </div>
                )}
                {customer.panNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      PAN Number
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.panNumber}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Created Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
                {customer.lastOrderDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Last Order Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(customer.lastOrderDate)}
                    </p>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Notes
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        title="Add Payment"
        size="md"
      >
        <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 
                 focus:border-green-600 focus:ring-2 focus:ring-green-100 focus:outline-none transition"
            >
              <option value="">Select Payment Mode</option>
              {transactionService
                .getTransactionModes()
                .filter((m) => m.value)
                .map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={paymentAmount?.toString().replace(/^0+(?=\d)/, "") || ""}
                min={0}
                max={Number(customer?.outstandingAmount || 0)}
                step={0.01}
                required
                onChange={(e) => {
                  if (
                    Number(e.target.value) > Number(customer?.netBalance || 0)
                  ) {
                    return;
                  }
                  setPaymentAmount(Number(e.target.value));
                }}
                placeholder="Enter payment amount"
                className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-6 py-2.5 text-sm text-gray-700 
                   focus:border-green-600 focus:ring-2 focus:ring-green-100 focus:outline-none transition"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
                ₹
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 italic">
              Max:{" "}
              <span className="font-medium text-gray-700">
                {formatCurrency(customer?.netBalance || 0)}
              </span>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={closePaymentModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg 
                 hover:bg-gray-200 transition disabled:opacity-50"
              disabled={paymentSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitPayment}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg 
                 hover:bg-green-700 focus:ring-2 focus:ring-green-200 transition disabled:opacity-50"
              disabled={paymentSubmitting}
            >
              {paymentSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Submit Payment"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Orders Section */}
      <div className="bg-white rounded-lg border mb-[35px] overflow-hidden border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ShoppingBagIcon className="h-5 w-5 mr-2" />
            Orders ({orders.length})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchOrders();
                fetchCustomer();
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Sync
            </button>
            {hasPermission("orders:create") && (
              <Link
                to={`/orders/new?customerId=${id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingBagIcon className="h-4 w-4 mr-1" />
                New Order
              </Link>
            )}
          </div>
        </div>
        <div className="overflow-hidden">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                No orders found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This customer hasn't placed any orders yet.
              </p>
              {hasPermission("orders:create") && (
                <Link
                  to={`/orders/new?customerId=${id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingBagIcon className="h-4 w-4 mr-2" />
                  Create First Order
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.orderNumber}
                            </div>
                            {order.godown && (
                              <div className="text-xs text-gray-500">
                                {order.godown.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatOrderItems(order.items)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <OrderStatusDropdown
                            order={order}
                            onStatusChange={() => {
                              fetchOrders(ordersPagination.currentPage);
                              fetchCustomer();
                            }}
                            readOnly={true}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={getPriorityColor(order.priority)}
                            size="sm"
                          >
                            {order.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Avatar
                             
                              name={`${order.createdBy?.firstName} ${order.createdBy?.lastName}`}
                              size="sm"
                              className="mr-2"
                            />
                            <span>
                              {order.createdBy?.firstName}{" "}
                              {order.createdBy?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/orders/${order._id}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-900"
                              title="View Order"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                            {hasPermission("orders:update") && (
                              <Link
                                to={`/orders/${order._id}/edit`}
                                className="text-green-600 hover:text-green-900"
                                title="Edit Order"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden">
                <div className="space-y-4 p-4">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={getPriorityColor(order.priority)}
                            size="sm"
                          >
                            {order.priority}
                          </Badge>
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/orders/${order._id}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-900"
                              title="View Order"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                            {hasPermission("orders:update") && (
                              <Link
                                to={`/orders/${order._id}/edit`}
                                className="text-green-600 hover:text-green-900"
                                title="Edit Order"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(order.orderDate)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Total Amount
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Items</span>
                          <span className="text-sm text-gray-900">
                            {formatOrderItems(order.items)}
                          </span>
                        </div>

                       
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Created By
                          </span>
                          <div className="flex items-center">
                            <Avatar
                              name={`${order.createdBy?.firstName} ${order.createdBy?.lastName}`}
                              size="xs"
                              className="mr-1"
                            />
                            <span className="text-sm text-gray-900">
                              {order.createdBy?.firstName}{" "}
                              {order.createdBy?.lastName}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <OrderStatusDropdown
                            order={order}
                            onStatusChange={() => {
                              fetchOrders(ordersPagination.currentPage);
                              fetchCustomer();
                            }}
                            readOnly={true}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders Pagination */}
            </>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Transaction History
          </h3>
          <button
            onClick={() => {
              fetchTransactions(transactionsPagination.currentPage);
              fetchCustomer();
            }}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Sync
          </button>
        </div>
        <div className="overflow-hidden">
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                No transactions found
              </h3>
              <p className="text-sm text-gray-500">
                This customer hasn't made any transactions yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Balance
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.transactionId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            const refs = Array.isArray(
                              transaction.transactionFor
                            )
                              ? transaction.transactionFor
                              : transaction.transactionFor
                              ? [transaction.transactionFor]
                              : [];
                            return refs.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {refs.map((ref, idx) => {
                                  const isObj =
                                    typeof ref === "object" && ref !== null;
                                  const id = isObj ? (ref as any)._id : ref;
                                  const label =
                                    isObj && (ref as any).orderNumber
                                      ? (ref as any).orderNumber
                                      : isObj && (ref as any).businessName
                                      ? (ref as any).businessName
                                      : String(id).slice(-6);
                                  const link =
                                    transaction.transactionForModel === "Order"
                                      ? `/orders/${id}`
                                      : `/customers/${id}`;
                                  return (
                                    <Link
                                      key={`${transaction._id}-${idx}`}
                                      to={link}
                                      target="_blank"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {label}
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={getTransactionModeColor(
                              transaction.transactionMode
                            )}
                            size="sm"
                          >
                            {transaction.transactionMode}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.amountPaid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(
                            transaction?.extraInfo?.netBalanceRemaining || 0
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.createdBy.firstName}{" "}
                          {transaction.createdBy.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {transactionsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        handlePageChange(transactionsPagination.currentPage - 1)
                      }
                      disabled={transactionsPagination.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        handlePageChange(transactionsPagination.currentPage + 1)
                      }
                      disabled={
                        transactionsPagination.currentPage ===
                        transactionsPagination.totalPages
                      }
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(transactionsPagination.currentPage - 1) *
                            transactionsPagination.itemsPerPage +
                            1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            transactionsPagination.currentPage *
                              transactionsPagination.itemsPerPage,
                            transactionsPagination.totalItems
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {transactionsPagination.totalItems}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            handlePageChange(
                              transactionsPagination.currentPage - 1
                            )
                          }
                          disabled={transactionsPagination.currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        {Array.from(
                          { length: transactionsPagination.totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={cn(
                              "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                              page === transactionsPagination.currentPage
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            handlePageChange(
                              transactionsPagination.currentPage + 1
                            )
                          }
                          disabled={
                            transactionsPagination.currentPage ===
                            transactionsPagination.totalPages
                          }
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
