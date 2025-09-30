import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import { useAuth } from "../../contexts/AuthContext";
import { useDebounce } from "../../hooks/useDebounce";
import type { Order, Customer, TableColumn, Godown } from "../../types";
import { apiService } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import OrderStatusDropdown from "../../components/orders/OrderStatusDropdown";

const OrdersPage: React.FC = () => {
  const { hasPermission } = useAuth();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownFilter, setGodownFilter] = useState("");
  const [viewType, setViewType] = useState<"orders" | "visits">("orders");

  // Common Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Order-specific Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");

  // Visit-specific Filters
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState("");
  const [visitStatusFilter, setVisitStatusFilter] = useState("");
  const [hasImageFilter, setHasImageFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit] = useState(10);

  // Sorting
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Image modal state
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    title: string;
  }>({ src: "", title: "" });
  const [showImageModal, setShowImageModal] = useState(false);

  const formatImageSrc = (imageData: string) => {
    return imageData.startsWith("data:")
      ? imageData
      : `data:image/jpeg;base64,${imageData}`;
  };

  const handleViewImage = (imageData: string, title: string) => {
    const formattedSrc = formatImageSrc(imageData);
    setSelectedImage({ src: formattedSrc, title });
    setShowImageModal(true);
  };

  // Load data functions
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build params based on view type
      const commonParams = {
        page: currentPage,
        limit,
        search: debouncedSearchTerm,
        customerId: customerFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        sortBy,
        sortOrder,
      };

      const params =
        viewType === "orders"
          ? {
              ...commonParams,
              status: statusFilter,
              paymentStatus: paymentStatusFilter,
              priority: priorityFilter,
              minAmount: minAmountFilter,
              maxAmount: maxAmountFilter,
              godownId: godownFilter,
            }
          : {
              ...commonParams,
              scheduleStatus: scheduleStatusFilter,
              visitStatus: visitStatusFilter,
              hasImage: hasImageFilter,
              address: addressFilter,
            };

      const response =
        viewType === "orders"
          ? await orderService.getOrders(params)
          : await orderService.getVisits(params);

      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        if (response?.data?.pagination) {
          setCurrentPage(response?.data?.pagination?.currentPage || 1);
          setTotalPages(response?.data?.pagination?.totalPages || 1);
          setTotalOrders((response?.data?.pagination as any).totalOrders || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load:", err);
      setError(err instanceof Error ? err.message : "Failed to load.");
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
    viewType,
    // Order-specific filters
    statusFilter,
    paymentStatusFilter,
    priorityFilter,
    minAmountFilter,
    maxAmountFilter,
    godownFilter,
    // Visit-specific filters
    scheduleStatusFilter,
    visitStatusFilter,
    hasImageFilter,
    addressFilter,
  ]);

  const loadCustomers = useCallback(async () => {
    try {
      const customerList = await customerService.getAllCustomers();
      setCustomers(customerList);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load godowns
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(
          API_CONFIG.ENDPOINTS.GODOWNS
        );
        if (res.success && res.data) setGodowns(res.data.godowns);
      } catch {}
    })();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    debouncedSearchTerm,
    customerFilter,
    dateFromFilter,
    dateToFilter,
    // Order-specific filters
    statusFilter,
    paymentStatusFilter,
    priorityFilter,
    minAmountFilter,
    maxAmountFilter,
    godownFilter,
    // Visit-specific filters
    scheduleStatusFilter,
    visitStatusFilter,
    hasImageFilter,
    addressFilter,
    currentPage,
  ]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    // Clear common filters
    setSearchTerm("");
    setCustomerFilter("");
    setDateFromFilter("");
    setDateToFilter("");

    // Clear order-specific filters
    setStatusFilter("");
    setPaymentStatusFilter("");
    setPriorityFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setGodownFilter("");

    // Clear visit-specific filters
    setScheduleStatusFilter("");
    setVisitStatusFilter("");
    setHasImageFilter("");
    setAddressFilter("");

    setCurrentPage(1);
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) =>
        order._id === updatedOrder._id ? updatedOrder : order
      )
    );
  };

  // Table columns
  const getColumns = (): TableColumn<Order>[] => {
    if (viewType === "visits") {
      return [
        {
          key: "orderNumber",
          label: "Visit Details",
          sortable: true,
          render: (_value, visit) => (
            <div className="min-w-0 py-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="font-semibold text-gray-900 text-sm">
                  {visit.orderNumber}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Created: {orderService.formatDate(visit.orderDate)}
              </div>
              <div className="text-xs text-gray-400">
                {Math.ceil(
                  (new Date().getTime() - new Date(visit.orderDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                days ago
              </div>
            </div>
          ),
        },
        {
          key: "customer",
          label: "Customer",
          render: (customer) => (
            <div className="flex items-center space-x-3 min-w-0 py-1">
              <Avatar name={customer?.businessName || "Customer"} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate text-sm">
                  {customer?.businessName || "—"}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {customer?.contactPersonName || customer?.customerId}
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "scheduleDate",
          label: "Schedule",
          sortable: true,
          render: (_value, visit) => (
            <div className="min-w-0 py-1">
              <div className="font-semibold text-gray-900 text-sm mb-1">
                {visit.scheduleDate
                  ? orderService.formatDate(visit.scheduleDate)
                  : "—"}
              </div>
              {visit.scheduleDate && (
                <div
                  className={`text-xs ${
                    new Date(visit.scheduleDate) < new Date()
                      ? "text-red-600"
                      : new Date(visit.scheduleDate).toDateString() ===
                        new Date().toDateString()
                      ? "text-blue-600"
                      : "text-green-600"
                  }`}
                >
                  {new Date(visit.scheduleDate) < new Date()
                    ? "Overdue"
                    : new Date(visit.scheduleDate).toDateString() ===
                      new Date().toDateString()
                    ? "Today"
                    : "Upcoming"}
                </div>
              )}
            </div>
          ),
        },
        {
          key: "notes",
          label: "Notes & Location",
          render: (_value, visit) => (
            <div className="min-w-0 py-1">
              <div className="text-sm text-gray-900 mb-1 truncate">
                {visit.notes || "No notes"}
              </div>
              {visit.captureLocation && (
                <div className="text-xs text-gray-500 truncate">
                  📍{" "}
                  {visit.captureLocation.address ||
                    `${visit.captureLocation.latitude}, ${visit.captureLocation.longitude}`}
                </div>
              )}
            </div>
          ),
        },
        {
          key: "actions",
          label: "Actions",
          render: (_value, visit) => (
            <div className="flex items-center justify-end space-x-1 py-1">
              <Link
                to={`/orders/visits/${visit._id}`}
                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="View Visit Details"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                to={`/orders/visits/${visit._id}/edit`}
                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200"
                title="Edit Visit"
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
              {visit.capturedImage && (
                <button
                  onClick={() =>
                    handleViewImage(
                      visit.capturedImage,
                      `Visit Image - ${
                        visit.customer?.businessName || "Unknown Customer"
                      }`
                    )
                  }
                  className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200"
                  title="View Image"
                >
                  <img
                    src={formatImageSrc(visit.capturedImage)}
                    alt="Check In"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </button>
              )}
            </div>
          ),
        },
      ];
    }

    // Default order columns
    return [
      {
        key: "orderNumber",
        label: "Order",
        sortable: true,
        render: (_value, order) => (
          <div className="py-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="font-medium text-gray-900 text-xs">
                {order.orderNumber}
              </div>
              {order.priority !== "normal" && (
                <span
                  className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                    order.priority === "urgent"
                      ? "bg-red-100 text-red-700"
                      : order.priority === "high"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.priority === "urgent"
                    ? "U"
                    : order.priority === "high"
                    ? "H"
                    : "N"}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {orderService.formatDate(order.orderDate)}
            </div>
          </div>
        ),
      },
      {
        key: "customer",
        label: "Customer",
        render: (customer) => (
          <div className="flex items-center space-x-2 py-0.5">
            <Avatar name={customer?.businessName || "Customer"} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate text-xs">
                {customer?.businessName || "—"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {customer?.contactPersonName}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "items",
        label: "Summary",
        render: (_value, order) => (
          <div className="py-0.5">
            <div className="font-medium text-gray-900 text-xs mb-0.5">
              {orderService.formatCurrency(order.totalAmount)}
            </div>
            <div className="text-xs text-gray-500">
              {order.items?.length || 0} item
              {(order.items?.length || 0) !== 1 ? "s" : ""}
            </div>
            {order.godown?.name && (
              <div className="text-xs text-gray-400 truncate">
                {order.godown.name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_value, order) => (
          <div className="py-0.5">
            <OrderStatusDropdown
              order={order}
              onOrderUpdate={handleOrderUpdate}
              compact
            />
          </div>
        ),
      },
      {
        key: "actions",
        label: "",
        render: (_value, order) => (
          <div className="flex items-center justify-end space-x-1 py-0.5">
            <Link
              to={`/orders/${order._id}`}
              className="inline-flex items-center justify-center w-7 h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              title="View"
            >
              <EyeIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              to={`/orders/${order._id}/edit`}
              className="inline-flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
              title="Edit"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        ),
      },
    ];
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">⚠️</div>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            Error Loading Orders
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadOrders}
            className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardDocumentListIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {viewType === "orders" ? "Orders" : "Visits"}
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {viewType === "orders"
                      ? "Manage customer orders"
                      : "Manage visits with scheduled tasks"}
                  </p>
                </div>
                {/* View Type Switch */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewType("orders")}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                      viewType === "orders"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => setViewType("visits")}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                      viewType === "visits"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Visits
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasPermission("orders.approve") && viewType === "orders" && (
                <Link
                  to="/orders/approval"
                  className="relative inline-flex items-center justify-center px-2 py-1.5 border border-amber-200 text-xs font-medium rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <ClockIcon className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Pending Approval</span>
                  <span className="sm:hidden">Pending</span>
                  {orders.filter((o) => o.status === "pending").length > 0 && (
                    <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">
                      {orders.filter((o) => o.status === "pending").length}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to={
                  viewType === "orders" ? "/orders/new" : "/orders/visits/new"
                }
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">
                  {viewType === "orders" ? "New Order" : "New Visit"}
                </span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* Compact Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            {/* Search Bar */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  viewType === "orders"
                    ? "Search orders..."
                    : "Search visits..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Status Pills - Mobile First */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                {
                  value: "pending",
                  label: "Pending",
                  count: orders.filter((o) => o.status === "pending").length,
                },
                {
                  value: "approved",
                  label: "Approved",
                  count: orders.filter((o) => o.status === "approved").length,
                },
                {
                  value: "processing",
                  label: "Production",
                  count: orders.filter((o) => o.status === "processing").length,
                },
                {
                  value: "completed",
                  label: "Done",
                  count: orders.filter((o) => o.status === "completed").length,
                },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === status.value ? "" : status.value
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === status.value
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{status.label}</span>
                  {status.count > 0 && (
                    <span className="text-xs bg-white rounded px-1">
                      {status.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  showFilters
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                More Filters
              </button>

              {(statusFilter ||
                paymentStatusFilter ||
                customerFilter ||
                dateFromFilter ||
                dateToFilter) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Collapsible Advanced Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {/* Common Filters */}
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.businessName}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="From Date"
                  />

                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="To Date"
                  />

                  {/* Order-specific Filters */}
                  {viewType === "orders" && (
                    <>
                      <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Payment Status</option>
                        {orderService.getPaymentStatuses().map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Priorities</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      <select
                        value={godownFilter}
                        onChange={(e) => setGodownFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Godowns</option>
                        {godowns.map((g) => (
                          <option key={g._id} value={g._id}>
                            {g.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        value={minAmountFilter}
                        onChange={(e) => setMinAmountFilter(e.target.value)}
                        placeholder="Min Amount"
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <input
                        type="number"
                        value={maxAmountFilter}
                        onChange={(e) => setMaxAmountFilter(e.target.value)}
                        placeholder="Max Amount"
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </>
                  )}

                  {/* Visit-specific Filters */}
                  {viewType === "visits" && (
                    <>
                      <select
                        value={scheduleStatusFilter}
                        onChange={(e) =>
                          setScheduleStatusFilter(e.target.value)
                        }
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Schedule Status</option>
                        <option value="overdue">Overdue</option>
                        <option value="today">Today</option>
                        <option value="upcoming">Upcoming</option>
                      </select>

                      <select
                        value={visitStatusFilter}
                        onChange={(e) => setVisitStatusFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Visit Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <select
                        value={hasImageFilter}
                        onChange={(e) => setHasImageFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Has Image</option>
                        <option value="true">With Image</option>
                        <option value="false">Without Image</option>
                      </select>

                      <input
                        type="text"
                        value={addressFilter}
                        onChange={(e) => setAddressFilter(e.target.value)}
                        placeholder="Search by address..."
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Stats */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-semibold text-sm">{totalOrders}</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="font-semibold text-sm text-amber-600">
                {orders.filter((o) => o.status === "pending").length}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Value</div>
              <div className="font-semibold text-xs">
                {orderService.formatCurrency(
                  orders.reduce((sum, o) => sum + o.totalAmount, 0)
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No {viewType === "orders" ? "orders" : "visits"} found
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {statusFilter || searchTerm
                  ? "Try adjusting filters"
                  : "Create your first order"}
              </p>
              {!statusFilter && !searchTerm ? (
                <Link
                  to="/orders/new"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create Order
                </Link>
              ) : (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm text-gray-900">
                          {order.orderNumber}
                        </h3>
                        {order.priority !== "normal" && (
                          <span
                            className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                              order.priority === "urgent"
                                ? "bg-red-100 text-red-700"
                                : order.priority === "high"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {order.priority === "urgent"
                              ? "U"
                              : order.priority === "high"
                              ? "H"
                              : "N"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Link
                          to={`/orders/${order._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/orders/${order._id}/edit`}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Avatar
                        name={order.customer?.businessName || "Customer"}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {order.customer?.businessName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {orderService.formatDate(order.orderDate)}
                        </div>
                      </div>
                    </div>

                    {viewType !== "visits" && (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {orderService.formatCurrency(order.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.items?.length || 0} items
                          </div>
                        </div>
                        <OrderStatusDropdown
                          order={order}
                          onOrderUpdate={handleOrderUpdate}
                          compact
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table
                  columns={getColumns()}
                  data={orders}
                  loading={false}
                  sortBy={sortBy}
                  onSort={handleSort}
                />
              </div>
            </>
          )}

          {/* Compact Pagination */}
          {totalPages > 1 && !loading && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
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

      {/* Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={selectedImage.title}
      >
        <div className="flex justify-center">
          <img
            src={selectedImage.src}
            alt={selectedImage.title}
            className="max-w-full max-h-96 object-contain rounded-lg"
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrdersPage;
