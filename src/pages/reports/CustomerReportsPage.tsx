import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import {
  getCustomerReports,
  getInactiveCustomers,
} from "../../services/reportService";
import type {
  CustomerReportResponse,
  InactiveCustomersResponse,
} from "../../services/reportService";
import { godownService } from "../../services/godownService";
import type { Godown } from "../../types";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Pagination from "../../components/ui/Pagination";
import { formatCurrency, formatDate } from "../../utils";
import {
  persistenceService,
  PERSIST_NS,
  clearOtherNamespaces,
} from "../../services/persistenceService";

const CustomerReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<CustomerReportResponse | null>(
    null
  );
  const [inactiveData, setInactiveData] =
    useState<InactiveCustomersResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "inactive">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [inactiveDays, setInactiveDays] = useState(7);
  const [sortBy, setSortBy] = useState("totalSpent");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dateRangeError, setDateRangeError] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null
  );
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [allCustomerGodowns, setAllCustomerGodowns] = useState("");
  const [godownId, setGodownId] = useState("");
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const initRef = useRef(false);

  // Load persisted state on mount and clear other namespaces
  useEffect(() => {
    clearOtherNamespaces(PERSIST_NS.CUSTOMER_REPORTS);
    const persistedFilters = persistenceService.getNS<any>(
      PERSIST_NS.CUSTOMER_REPORTS,
      "filters",
      {
        startDate: "",
        endDate: "",
        inactiveDays: 7,
        sortBy: "totalSpent",
        sortOrder: "desc",
        showFilters: false,
        activeTab: "all",
        activeQuickFilter: null,
        godownId: "",
      }
    );
    setStartDate(persistedFilters.startDate || "");
    setEndDate(persistedFilters.endDate || "");
    setInactiveDays(persistedFilters.inactiveDays || 7);
    setSortBy(persistedFilters.sortBy || "totalSpent");
    setSortOrder(persistedFilters.sortOrder || "desc");
    setShowFilters(!!persistedFilters.showFilters);
    setActiveTab((persistedFilters.activeTab as "all" | "inactive") || "all");
    setActiveQuickFilter(persistedFilters.activeQuickFilter || null);
    setGodownId(persistedFilters.godownId || "");
    setPage(persistedFilters.page || 1);
    setLimit(persistedFilters.limit || 10);
    initRef.current = true;
  }, []);

  // Persist filters
  useEffect(() => {
    if (!initRef.current) return;
    persistenceService.setNS(PERSIST_NS.CUSTOMER_REPORTS, "filters", {
      startDate,
      endDate,
      inactiveDays,
      sortBy,
      sortOrder,
      showFilters,
      activeTab,
      activeQuickFilter,
      godownId,
      page,
      limit,
    });
  }, [
    startDate,
    endDate,
    inactiveDays,
    sortBy,
    sortOrder,
    showFilters,
    activeTab,
    activeQuickFilter,
    godownId,
    page,
    limit,
  ]);

  // Quick date filter helper functions
  const getQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const getQuickDateRangeMonth = (months: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const getQuickDateRangeYear = (years: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - years);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const handleQuickFilter = (
    type: "days" | "months" | "years",
    value: number
  ) => {
    const filterKey = `${type}-${value}`;

    // If the same filter is clicked again, deactivate it
    if (activeQuickFilter === filterKey) {
      setActiveQuickFilter(null);
      setStartDate("");
      setEndDate("");
      setDateRangeError("");
      return;
    }

    let dateRange;

    if (type === "days") {
      dateRange = getQuickDateRange(value);
    } else if (type === "months") {
      dateRange = getQuickDateRangeMonth(value);
    } else {
      dateRange = getQuickDateRangeYear(value);
    }

    setActiveQuickFilter(filterKey);
    setStartDate(dateRange.startDate);
    setEndDate(dateRange.endDate);
    setDateRangeError("");
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  // Trigger fetch when filters change
  useEffect(() => {
    if (initRef.current) {
      fetchReports();
    }
  }, [startDate, endDate, sortBy, sortOrder, inactiveDays, godownId, page, limit]);

  // Fetch godowns
  const fetchGodowns = async (overrideDates?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      // Build filter parameters for godown counts
      const params: any = {};

      if (activeTab === "inactive") {
        // For inactive tab, only use inactiveDays parameter (no date filters)
        params.inactiveDays = inactiveDays;
      } else {
        // For all customers tab, use date filters and only count customers with orders
        const effectiveStartDate =
          overrideDates?.startDate !== undefined
            ? overrideDates.startDate
            : startDate;
        const effectiveEndDate =
          overrideDates?.endDate !== undefined ? overrideDates.endDate : endDate;

        if (effectiveStartDate) params.dateFrom = effectiveStartDate;
        if (effectiveEndDate) params.dateTo = effectiveEndDate;
        params.onlyWithOrders = 'true'; // Only count customers who have placed orders
      }

      const resp = await godownService.getGodowns(params);
      setGodowns(resp.data?.godowns || []);
      setAllCustomerGodowns(resp.data?.allCustomerCount || 0);
    } catch (error) {
      console.error("Error fetching godowns:", error);
    }
  };

  // Fetch godowns when date range, active tab, or inactive days changes
  useEffect(() => {
    if (initRef.current) {
      fetchGodowns();
    }
  }, [startDate, endDate, activeTab, inactiveDays]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      if (activeTab === "all") {
        const params: any = { sortBy, sortOrder, page, limit };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (godownId) params.godownId = godownId;

        const data = await getCustomerReports(params);
        setReportData(data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.totalRecords);
        }
      } else {
        const data = await getInactiveCustomers(inactiveDays, godownId, page, limit);
        setInactiveData(data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.totalRecords);
        }
      }
    } catch (error) {
      console.error("Error fetching customer reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sync functionality
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchReports();
    } catch (error) {
      console.error("Failed to sync customer reports data:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleApplyFilters = () => {
    fetchReports();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setInactiveDays(7);
    setSortBy("totalSpent");
    setSortOrder("desc");
    setDateRangeError("");
    setActiveQuickFilter(null); // Clear active quick filter
    setGodownId("");
  };

  const validateDateRange = (start: string, end: string) => {
    if (start && end && new Date(start) > new Date(end)) {
      setDateRangeError("Start date cannot be after end date");
      return false;
    }
    setDateRangeError("");
    return true;
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
    validateDateRange(newStartDate, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
    validateDateRange(startDate, newEndDate);
  };

  const exportToCSV = () => {
    if (activeTab === "all" && reportData?.reports) {
      const headers = [
        "Customer ID",
        "Business Name",
        "Contact Person",
        "Phone",
        "Type",
        "City",
        "Total Orders",
        "Total Spent",
        "Total Outstanding",
        "Avg Order Value",
        "Last Order Date",
        "Days Since Last Order",
        "Lifetime Value",
      ];

      const rows = reportData.reports.map((report) => [
        report.customerId,
        report.businessName,
        report.contactPerson,
        report.phone,
        report.customerType,
        report.city,
        report.totalOrders,
        report.totalSpent,
        report.totalOutstanding,
        report.avgOrderValue,
        formatDate(report.lastOrderDate),
        report.daysSinceLastOrder,
        report.lifetimeValue,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `customer-reports-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
    } else if (activeTab === "inactive" && inactiveData?.customers) {
      const headers = [
        "Customer ID",
        "Business Name",
        "Contact Person",
        "Phone",
        "Type",
        "City",
        "Last Order Date",
        "Days Since Last Order",
        "Total Orders",
        "Total Order Value",
        "Outstanding Amount",
      ];

      const rows = inactiveData.customers.map((customer) => [
        customer.customerId,
        customer.businessName,
        customer.contactPerson,
        customer.phone,
        customer.customerType,
        customer.city,
        customer.lastOrderDate ? formatDate(customer.lastOrderDate) : "Never",
        customer.daysSinceLastOrder || "N/A",
        customer.totalOrders,
        customer.totalOrderValue,
        customer.outstandingAmount,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `inactive-customers-${inactiveDays}days-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const summary = reportData?.summary;
  const reports = reportData?.reports || [];
  const inactiveCustomers = inactiveData?.customers || [];

  const allCustomersColumns = [
    {
      key: "businessName",
      label: "Customer",
      render: (value: string, row: any) => (
        <Link to={`/reports/customers/${row._id}`} className="hover:underline">
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.customerId}</div>
        </Link>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact",
      render: (value: string, row: any) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      key: "customerType",
      label: "Type",
      render: (value: string) => (
        <Badge
          variant={
            value === "Distributor"
              ? "success"
              : value === "Wholesaler"
              ? "info"
              : "default"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "totalOrders",
      label: "Orders",
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: "totalSpent",
      label: "Total Spent",
      render: (value: number) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "totalOutstanding",
      label: "Outstanding",
      render: (value: number) => (
        <span
          className={`font-medium ${
            value > 0 ? "text-orange-600" : "text-gray-500"
          }`}
        >
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "avgOrderValue",
      label: "Avg Order",
      render: (value: number) => (
        <span className="text-gray-700">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "daysSinceLastOrder",
      label: "Last Order",
      render: (value: number, row: any) => (
        <div>
          <div className="text-sm text-gray-900">{value} days ago</div>
          <div className="text-xs text-gray-500">
            {formatDate(row.lastOrderDate)}
          </div>
        </div>
      ),
    },
    {
      key: "lifetimeValue",
      label: "LTV",
      render: (value: number) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (value: any, row: any) => (
        <Link
          to={`/reports/customers/${row._id}`}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
        >
          <EyeIcon className="h-3 w-3" />
          View
        </Link>
      ),
    },
  ];

  const inactiveCustomersColumns = [
    {
      key: "businessName",
      label: "Customer",
      render: (value: string, row: any) => (
        <Link to={`/reports/customers/${row._id}`} className="hover:underline">
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.customerId}</div>
        </Link>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact",
      render: (value: string, row: any) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      key: "city",
      label: "Location",
      render: (value: string, row: any) => (
        <div className="text-sm text-gray-900">
          {value}, {row.state}
        </div>
      ),
    },
    {
      key: "daysSinceLastOrder",
      label: "Inactive Days",
      render: (value: number | null) => (
        <Badge
          variant={
            value === null
              ? "error"
              : value > 30
              ? "error"
              : value > 14
              ? "warning"
              : "default"
          }
        >
          {value === null ? "Never ordered" : `${value} days`}
        </Badge>
      ),
    },
    {
      key: "lastOrderDate",
      label: "Last Order Date",
      render: (value: string | null) => (
        <span className="text-sm text-gray-900">
          {value ? formatDate(value) : "Never"}
        </span>
      ),
    },
    {
      key: "totalOrders",
      label: "Total Orders",
      render: (value: number) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: "totalOrderValue",
      label: "Total Value",
      render: (value: number) => (
        <span className="font-medium text-gray-700">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "outstandingAmount",
      label: "Outstanding",
      render: (value: number) => (
        <span
          className={`font-medium ${
            value > 0 ? "text-orange-600" : "text-gray-500"
          }`}
        >
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (value: any, row: any) => (
        <Link
          to={`/reports/customers/${row._id}`}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
        >
          <EyeIcon className="h-3 w-3" />
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {" "}
                  Customer Reports
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Track performance insights
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex cursor-pointer gap-1 items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync Customer Reports Data"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                />{" "}
                Sync
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Sub Tabs */}
          <nav className="flex space-x-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              <span>All Customers</span>
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "inactive"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>Inactive</span>
            </button>
          </nav>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Summary Cards - All Customers */}
        {activeTab === "all" && summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Customers</p>
                  <p className="text-xl font-bold text-gray-900 truncate">
                    {summary.totalCustomers}
                  </p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Active</p>
                  <p className="text-xl font-bold text-green-600 truncate">
                    {summary.activeCustomers}
                  </p>
                </div>
                <ShoppingCartIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Revenue</p>
                  <p className="text-xl font-bold text-green-600 truncate">
                    {formatCurrency(summary.totalRevenueAll)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Avg Value</p>
                  <p className="text-xl font-bold text-blue-600 truncate">
                    {formatCurrency(summary.avgCustomerValue)}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Inactive Alert Banner */}
        {activeTab === "inactive" && inactiveData && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-orange-900 mb-1">
                  {inactiveData.count} Inactive Customers
                </h3>
                <p className="text-xs text-orange-700">
                  No orders in the last {inactiveData.days} days
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Godown Selector - Cards (matches OrdersPage design) */}
        {godowns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">
                Customers on godown
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {/* All Godowns card */}
              <button
                type="button"
                onClick={() => {
                  setGodownId("");
                }}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  godownId === ""
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
                aria-pressed={godownId === ""}
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-emerald-100">
                    <BuildingOfficeIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm flex items-center gap-2 font-medium text-gray-900">
                      All Customers
                      
                        <span className="text-[10px] text-blue-700 bg-blue-100 rounded px-1.5 py-0.5">{allCustomerGodowns}</span>
                      
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
                    setGodownId(g._id);
                  }}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    godownId === g._id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                  aria-pressed={godownId === g._id}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-blue-100">
                      <BuildingOfficeIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium flex gap-2 text-gray-900">
                        {g.name}
                        <span className="text-[10px] flex justify-center items-center text-gray-700 bg-gray-100 rounded px-1.5 py-0.5">
                          Customers:
                          {" " +g.customerCount || 0}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {g.location?.city || "Location"}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Quick Date Filters Section - Only show for "all" tab */}
        {activeTab === "all" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                Quick Date Filters
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFilter("days", 0)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeQuickFilter === "days-0"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-md"
                    : "text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter("days", 7)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeQuickFilter === "days-7"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-md"
                    : "text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter("days", 15)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeQuickFilter === "days-15"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-md"
                    : "text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                Last 15 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter("months", 1)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeQuickFilter === "months-1"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-md"
                    : "text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                Last Month
              </button>
            </div>
          </div>
        )}

        {/* Filter Toggle Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {(startDate ||
              endDate || godownId ||
              (activeTab === "inactive" && inactiveDays !== 7)) && (
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
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  Filters
                </span>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {activeTab === "all" ? (
              <div className="space-y-3">
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                        dateRangeError
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                        dateRangeError
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Date Range Error Message */}
                {dateRangeError && (
                  <div className="flex items-center text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {dateRangeError}
                  </div>
                )}

         

                {/* Sort Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="totalSpent">Total Spent</option>
                      <option value="totalOrders">Total Orders</option>
                      <option value="avgOrderValue">Avg Order Value</option>
                      <option value="daysSinceLastOrder">
                        Days Since Last Order
                      </option>
                      <option value="lifetimeValue">Lifetime Value</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Inactive Days
                </label>
                <select
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                  <option value={10}>10 days</option>
                  <option value={14}>14 days</option>
                  <option value={21}>21 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleResetFilters}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Mobile Cards View - All Customers */}
        {activeTab === "all" && (
          <div className="block lg:hidden space-y-3 mb-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-white rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/reports/customers/${report._id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                    >
                      {report.businessName}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {report.customerId}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {report.contactPerson} • {report.phone}
                    </div>
                    <div className="mt-1">
                      <Badge
                        variant={
                          report.customerType === "Distributor"
                            ? "success"
                            : report.customerType === "Wholesaler"
                            ? "info"
                            : "default"
                        }
                      >
                        {report.customerType}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    to={`/reports/customers/${report._id}`}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Orders</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {report.totalOrders}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Avg Order</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(report.avgOrderValue)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-xs text-green-600">Total Spent</div>
                    <div className="text-sm font-semibold text-green-700">
                      {formatCurrency(report.totalSpent)}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <div className="text-xs text-orange-600">Outstanding</div>
                    <div className="text-sm font-semibold text-orange-700">
                      {formatCurrency(report.totalOutstanding)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                  <div className="text-gray-600">
                    Last order: {report.daysSinceLastOrder} days ago
                  </div>
                  <div className="font-semibold text-blue-600">
                    LTV: {formatCurrency(report.lifetimeValue)}
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No Customers Found
                </h3>
                <p className="text-xs text-gray-500">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mobile Cards View - Inactive Customers */}
        {activeTab === "inactive" && (
          <div className="block lg:hidden space-y-3 mb-4">
            {inactiveCustomers.map((customer) => (
              <div
                key={customer._id}
                className="bg-white rounded-lg border border-gray-200 p-3"
              >
                <div className="mb-3">
                  <div className="font-medium text-gray-900 truncate">
                    {customer.businessName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {customer.customerId}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {customer.contactPerson} • {customer.phone}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {customer.city}, {customer.state}
                  </div>
                </div>

                <div className="mb-3">
                  <Badge
                    variant={
                      customer.daysSinceLastOrder === null
                        ? "error"
                        : customer.daysSinceLastOrder > 30
                        ? "error"
                        : customer.daysSinceLastOrder > 14
                        ? "warning"
                        : "default"
                    }
                  >
                    {customer.daysSinceLastOrder === null
                      ? "Never ordered"
                      : `${customer.daysSinceLastOrder} days inactive`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Orders</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {customer.totalOrders}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-500">Total Value</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.totalOrderValue)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                  <div className="text-gray-600">
                    Last order:{" "}
                    {customer.lastOrderDate
                      ? formatDate(customer.lastOrderDate)
                      : "Never"}
                  </div>
                  <div
                    className={`font-medium ${
                      customer.outstandingAmount > 0
                        ? "text-orange-600"
                        : "text-gray-500"
                    }`}
                  >
                    Outstanding: {formatCurrency(customer.outstandingAmount)}
                  </div>
                </div>
              </div>
            ))}

            {inactiveCustomers.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No Inactive Customers
                </h3>
                <p className="text-xs text-gray-500">
                  All customers are active
                </p>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200">
          <Table
            columns={
              activeTab === "all"
                ? allCustomersColumns
                : inactiveCustomersColumns
            }
            data={activeTab === "all" ? reports : inactiveCustomers}
            emptyMessage={
              activeTab === "all"
                ? "No customer reports found"
                : `No inactive customers found (${inactiveDays} days)`
            }
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalRecords}
              itemsPerPage={limit}
              onPageChange={setPage}
              onItemsPerPageChange={setLimit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerReportsPage;
