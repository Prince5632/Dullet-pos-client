import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import { userService } from "../../services/userService";
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
import { resolveCapturedImageSrc } from "../../utils/image";

interface DashboardStats {
  orders: {
    total: number;
    totalVisits: number;
    pending: number;
    approved: number;
    completed: number;
    todayOrders: number;
    todayVisits: number;
    todayRevenue: number;
    pendingApproval: number;
  };
  users: {
    total: number;
    active: number;
    todayLogins: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
}

const OrdersPage: React.FC = () => {
  const location = useLocation();
  const isVisitsRoute = location.pathname.startsWith("/visits");
  const { hasPermission, user } = useAuth();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownFilter, setGodownFilter] = useState("");
  const [viewType, setViewType] = useState<"orders" | "visits">(() =>
    isVisitsRoute ? "visits" : "orders"
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
  const [limit, setLimit] = useState(10);

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

  const handleViewImage = (imageData: string | undefined, title: string) => {
    if (!imageData) return;
    const formattedSrc = resolveCapturedImageSrc(imageData || "");
    if (formattedSrc) {
      setSelectedImage({ src: formattedSrc, title });
      setShowImageModal(true);
    }
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
        const pagination = (response as any)?.data?.pagination;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalOrders(pagination.totalOrders || 0);
        } else {
          setTotalPages(1);
          setTotalOrders(response.data.orders?.length || 0);
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

  const fetchStats = useCallback(async () => {
    const roleName = user?.role?.name?.toLowerCase();
    if (roleName !== "super admin" && roleName !== "admin") return;

    try {
      setStatsLoading(true);

      const promises = [];

      if (hasPermission("orders.read")) {
        promises.push(orderService.getOrderStats({ godownId: godownFilter }));
      }

      const results = await Promise.allSettled(promises);

      let orderStats: any = null;
      let userStats: {
        totalUsers: number;
        activeUsers: number;
        todayLogins: number;
        inactiveUsers: number;
      } | null = null;

      let idx = 0;
      if (hasPermission("orders.read")) {
        if (results[idx]?.status === "fulfilled") {
          orderStats = (results[idx] as PromiseFulfilledResult<any>).value;
        }
        idx += 1;
      }

      // Fallback: compute user counts from paginated list if stats unavailable
      if (hasPermission("users.read")) {
        try {
          const [allUsersRes, activeUsersRes] = await Promise.all([
            userService.getUsers({ limit: 1 }),
            userService.getUsers({ limit: 1, isActive: "true" as any }),
          ]);
          const totalUsers =
            (allUsersRes as any)?.data?.pagination?.totalUsers ||
            (allUsersRes as any)?.pagination?.totalUsers ||
            0;
          const activeUsers =
            (activeUsersRes as any)?.data?.pagination?.totalUsers ||
            (activeUsersRes as any)?.pagination?.totalUsers ||
            0;
          userStats = {
            totalUsers,
            activeUsers,
            todayLogins: 0,
            inactiveUsers: Math.max(totalUsers - activeUsers, 0),
          };
        } catch {}
      }

      setStats({
        orders: {
          total: orderStats?.totalOrders || 0,
          totalVisits: orderStats?.totalVisits || 0,
          pending: orderStats?.pendingOrders || 0,
          approved: orderStats?.approvedOrders || 0,
          completed: orderStats?.completedOrders || 0,
          todayOrders: orderStats?.todayOrders || 0,
          todayVisits: orderStats?.todayVisits || 0,
          todayRevenue: orderStats?.monthlyRevenue || 0,
          pendingApproval: orderStats?.pendingOrders || 0,
        },
        users: {
          total: userStats?.totalUsers ?? 0,
          active: userStats?.activeUsers ?? 0,
          todayLogins: userStats?.todayLogins ?? 0,
        },
        revenue: {
          today: orderStats?.monthlyRevenue || 0,
          thisWeek: orderStats?.monthlyRevenue || 0,
          thisMonth: orderStats?.monthlyRevenue || 0,
          growth: 5.2,
        },
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [godownFilter, hasPermission, user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  // Sync viewType with the current route
  useEffect(() => {
    setViewType(isVisitsRoute ? "visits" : "orders");
  }, [isVisitsRoute]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
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
  ]);

  // Reset filters when view type changes
  useEffect(() => {
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

    // Reset pagination
    setCurrentPage(1);
  }, [viewType]);

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
        order._id === updatedOrder._id
          ? { ...order, status: updatedOrder.status }
          : order
      )
    );
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Table columns
  const getColumns = (): TableColumn<any>[] => {
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
                {(() => {
                  const daysAgo = Math.floor(
                    (new Date().getTime() -
                      new Date(visit.orderDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return daysAgo === 0
                    ? "Today"
                    : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
                })()}
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
          label: "Visit Date",
          sortable: true,
          render: (_value, visit) => (
            <div className="min-w-0 py-1">
              <div className="font-semibold text-gray-900 text-sm">
                {visit.scheduleDate
                  ? orderService.formatDate(visit.scheduleDate)
                  : "—"}
              </div>
            </div>
          ),
        },
        {
          key: "notes",
          label: "Notes & Location",
          render: (_value, visit) => (
            <div className="min-w-[100px] py-1">
              <div className="text-sm text-gray-900 mb-1 truncate">
                {visit.notes || "No notes"}
              </div>
              {visit.captureLocation && (
                <div className="text-xs text-gray-500 whitespace-normal break-words">
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
                to={`/visits/${visit._id}`}
                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="View Visit Details"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                to={`/visits/${visit._id}/edit`}
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
                    src={resolveCapturedImageSrc(visit.capturedImage) || ""}
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
                      : "Log and manage customer visits"}
                  </p>
                </div>
                {/* View switch removed; visits has its own tab */}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* {hasPermission("orders.approve") && viewType === "orders" && (
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
              )} */}
              <Link
                to={viewType === "orders" ? "/orders/new" : "/visits/new"}
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
            {viewType === "orders" && (
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
                    count: orders.filter((o) => o.status === "processing")
                      .length,
                  },
                  {
                    value: "completed",
                    label: "Done",
                    count: orders.filter((o) => o.status === "completed")
                      .length,
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
                    {/* {status.count > 0 && (
                      <span className="text-xs bg-white rounded px-1">
                        {status.count}
                      </span>
                    )} */}
                  </button>
                ))}
              </div>
            )}

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
                        placeholder="Search by location..."
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {viewType === "orders" &&
          (user?.role?.name?.toLowerCase() === "super admin" ||
            user?.role?.name?.toLowerCase() === "admin") && (
            <>
              {/* Godown Selector - Cards (matches Dashboard design) */}
              {godowns.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-700">
                      Select Godown
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {/* All Godowns card */}
                    <button
                      type="button"
                      onClick={() => {
                        setGodownFilter("");
                      }}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        godownFilter === ""
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                      aria-pressed={godownFilter === ""}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-emerald-100">
                          <BuildingOfficeIcon className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm flex items-center gap-2 font-medium text-gray-900">
                            All Godowns
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                              Orders:{" "}
                              {godowns.reduce(
                                (sum, x) => sum + (x.orderCount || 0),
                                0
                              )}
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                              View across locations
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {godowns.map((g) => (
                      <button
                        key={g._id}
                        type="button"
                        onClick={() => {
                          setGodownFilter(g._id);
                        }}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          godownFilter === g._id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                        aria-pressed={godownFilter === g._id}
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-md bg-blue-100">
                            <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium flex gap-2 text-gray-900">
                              {g.name}
                              <span className="text-[10px] flex justify-center items-center text-gray-700 bg-gray-100 rounded px-1.5 py-0.5">
                                Orders: {g.orderCount ?? 0}
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">
                                {g.location.city}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              {stats && !statsLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    {
                      label: "Revenue",
                      value: `₹${((stats.revenue.today || 0) / 1000).toFixed(
                        1
                      )}k`,
                      subtitle: "Today",
                      icon: BanknotesIcon,
                      bgColor: "bg-emerald-500",
                      trend: stats.revenue.growth,
                    },
                    {
                      label: "Orders",
                      value: stats.orders.total.toString(),
                      subtitle: `${stats.orders.totalVisits} visits`,
                      icon: ClipboardDocumentListIcon,
                      bgColor: "bg-blue-500",
                    },
                    {
                      label: "Pending",
                      value: stats.orders.pendingApproval.toString(),
                      subtitle: "Approval",
                      icon: ExclamationTriangleIcon,
                      bgColor: "bg-amber-500",
                      urgent: stats.orders.pendingApproval > 0,
                    },
                    {
                      label: "Users",
                      value: stats.users.total.toString(),
                      subtitle: `${stats.users.active} active`,
                      icon: UserGroupIcon,
                      bgColor: "bg-purple-500",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`relative flex items-start gap-3 bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm ${
                        stat.urgent ? "ring-2 ring-amber-200" : ""
                      }`}
                    >
                      <div
                        className={`${stat.bgColor} rounded-lg p-2 mt-[4px] shrink-0`}
                      >
                        <stat.icon className="h-4 w-4 text-white" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                          {stat.trend !== undefined && (
                            <span
                              className={`text-xs ${
                                stat.trend >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {stat.trend >= 0 ? "↑" : "↓"}
                              {Math.abs(stat.trend)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{stat.label}</p>
                        <p className="text-[10px] text-gray-400">
                          {stat.subtitle}
                        </p>
                      </div>

                      {stat.urgent && (
                        <div className="absolute top-2 right-2 h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {statsLoading && (
                <div className="flex items-center justify-center py-4 mb-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}
            </>
          )}
        {/* Compact Stats for other roles */}
        {!loading &&
          orders.length > 0 &&
          viewType === "orders" &&
          user?.role?.name?.toLowerCase() !== "super admin" &&
          user?.role?.name?.toLowerCase() !== "admin" && (
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
                  : viewType === "orders"
                  ? "Create your first order"
                  : "Create your first visit"}
              </p>
              {!statusFilter && !searchTerm ? (
                viewType === "orders" ? (
                  <Link
                    to="/orders/new"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Create Order
                  </Link>
                ) : (
                  <Link
                    to="/visits/new"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Create Visit
                  </Link>
                )
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
                          to={
                            viewType === "visits"
                              ? `/visits/${order._id}`
                              : `/orders/${order._id}`
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={
                            viewType === "visits"
                              ? `/visits/${order._id}/edit`
                              : `/orders/${order._id}/edit`
                          }
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        {viewType === "visits" && order.capturedImage && (
                          <button
                            onClick={() =>
                              handleViewImage(
                                order.capturedImage,
                                `Visit Image - ${
                                  order.customer?.businessName ||
                                  "Unknown Customer"
                                }`
                              )
                            }
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="View Image"
                          >
                            <img
                              src={
                                resolveCapturedImageSrc(order.capturedImage) ||
                                ""
                              }
                              alt="Visit Image"
                              className="w-4 h-4 object-cover rounded"
                            />
                          </button>
                        )}
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
                onItemsPerPageChange={handleItemsPerPageChange}
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
