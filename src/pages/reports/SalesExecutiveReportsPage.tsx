import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { getSalesExecutiveReports } from "../../services/reportService";
import { godownService } from "../../services/godownService";
import type { SalesExecutiveReportResponse } from "../../services/reportService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils";

type ReportType = "orders" | "visits";

const SalesExecutiveReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] =
    useState<SalesExecutiveReportResponse | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState("desc");
  const [department, setDepartment] = useState("Sales");
  const [godowns, setGodowns] = useState<any[]>([]);
  const [godownId, setGodownId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(() => {
    const saved = localStorage.getItem('salesExecutiveReportType');
    return (saved as ReportType) || "orders";
  });

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  useEffect(() => {
    localStorage.setItem('salesExecutiveReportType', reportType);
  }, [reportType]);

  useEffect(() => {
    fetchReports();
  }, [godownId]);

  useEffect(() => {
    fetchReports();
  }, [department]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: any = { sortBy, sortOrder, department };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (godownId) params.godownId = godownId;

      // Add type filter for orders vs visits
      params.type = reportType === "orders" ? "order" : "visit";

      const data = await getSalesExecutiveReports(params);
      setReportData(data);
    } catch (error) {
      console.error("Error fetching sales executive reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load godowns for filter
    (async () => {
      try {
        const resp = await godownService.getGodowns();
        setGodowns(resp.data?.godowns || []);
      } catch {}
    })();
  }, []);

  const handleApplyFilters = () => {
    fetchReports();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSortBy("totalRevenue");
    setSortOrder("desc");
    setDepartment("Sales");
    setGodownId("");
  };

  const exportToCSV = () => {
    if (!reportData?.reports) return;

    let headers: string[];
    let rows: any[][];

    if (reportType === "orders") {
      headers = [
        "Employee ID",
        "Name",
        "Department",
        "Position",
        "Role",
        "Total Orders",
        "Total Revenue",
        "Total Paid",
        "Outstanding",
        "Avg Order Value",
        "Unique Customers",
        "Conversion Rate",
        "Pending",
        "Approved",
        "Delivered",
        "Completed",
      ];

      rows = reportData.reports.map((report) => [
        report.employeeId,
        report.executiveName,
        report.department,
        report.position,
        report.roleName,
        report.totalOrders,
        report.totalRevenue,
        report.totalPaidAmount,
        report.totalOutstanding,
        report.avgOrderValue,
        report.uniqueCustomersCount,
        `${report.conversionRate}%`,
        report.pendingOrders,
        report.approvedOrders,
        report.deliveredOrders,
        report.completedOrders,
      ]);
    } else {
      headers = [
        "Employee ID",
        "Name",
        "Department",
        "Position",
        "Role",
        "Total Visits",
        "Unique Locations",
        // "Conversion Rate",
        // "Pending",
        // "Approved",
        // "Delivered",
        // "Completed",
      ];

      rows = reportData.reports.map((report) => [
        report.employeeId,
        report.executiveName,
        report.department,
        report.position,
        report.roleName,
        report.totalOrders,
        report.uniqueCustomersCount,
        // `${report.conversionRate}%`,
        // report.pendingOrders,
        // report.approvedOrders,
        // report.deliveredOrders,
        // report.completedOrders,
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sales-executive-${reportType}-reports-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const summary = reportData?.summary;
  const reports = reportData?.reports || [];

  const getColumns = () => {
    const baseColumns = [
      {
        key: "executiveName",
        label: "Sales Executive",
        render: (value: string, row: any) => (
          <Link
            to={`/reports/sales-executives/${row._id}?type=${reportType}`}
            className="hover:underline"
          >
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.employeeId}</div>
          </Link>
        ),
      },
      {
        key: "department",
        label: "Department",
        render: (value: string, row: any) => (
          <div>
            <div className="text-sm text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{row.position}</div>
          </div>
        ),
      },
      {
        key: "totalOrders",
        label: reportType === "orders" ? "Orders" : "Visits",
        render: (value: number) => (
          <span className="font-medium text-gray-900">{value}</span>
        ),
      },
    ];

    if (reportType === "orders") {
      return [
        ...baseColumns,
        {
          key: "totalRevenue",
          label: "Total Revenue",
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
          key: "uniqueCustomersCount",
          label: "Customers",
          render: (value: number) => (
            <span className="text-gray-900">{value}</span>
          ),
        },
        {
          key: "status",
          label: "Order Status",
          render: (_: any, row: any) => (
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Pending:</span>
                <span className="font-medium">{row.pendingOrders}</span>
              </div>
            </div>
          ),
        },
      ];
    } else {
      return [
        ...baseColumns,
        {
          key: "uniqueCustomersCount",
          label: "Locations",
          render: (value: number) => (
            <span className="text-gray-900">{value}</span>
          ),
        },
        // {
        //   key: 'status',
        //   label: 'Visit Status',
        //   render: (_: any, row: any) => (
        //     <div className="text-xs space-y-1">
        //       <div className="flex justify-between">
        //         <span className="text-gray-500">Pending:</span>
        //         <span className="font-medium">{row.pendingOrders}</span>
        //       </div>
        //     </div>
        //   ),
        // },
      ];
    }
  };

  const columns = getColumns();

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
                <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Track performance insights
                </p>
              </div>
            </div>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Main Tabs Navigation */}
          <nav className="flex space-x-4 overflow-x-auto no-scrollbar mb-3">
            <Link
              to="/reports/sales-executives"
              className="flex items-center gap-1.5 px-3 py-2 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap"
            >
              <UserGroupIcon className="h-4 w-4" />
              <span>Sales Executives</span>
            </Link>
            <Link
              to="/reports/customers"
              className="flex items-center gap-1.5 px-3 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span>Customers</span>
            </Link>
          </nav>

          {/* Sub-tabs for Orders vs Visits */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setReportType("orders")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                reportType === "orders"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ShoppingBagIcon className="h-4 w-4" />
              <span>Orders</span>
            </button>
            <button
              onClick={() => setReportType("visits")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                reportType === "visits"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ClipboardDocumentListIcon className="h-4 w-4" />
              <span>Visits</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Summary Cards - Mobile Grid */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Executives</p>
                  <p className="text-xl font-bold text-gray-900 truncate">
                    {summary.totalExecutives}
                  </p>
                </div>
                <UserGroupIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {reportType === "orders" ? "Orders" : "Visits"}
                  </p>
                  <p className="text-xl font-bold text-gray-900 truncate">
                    {summary.totalOrdersAll}
                  </p>
                </div>
                {reportType === "orders" ? (
                  <ShoppingBagIcon className="h-8 w-8 text-purple-500 flex-shrink-0" />
                ) : (
                  <ClipboardDocumentListIcon className="h-8 w-8 text-purple-500 flex-shrink-0" />
                )}
              </div>
            </div>

            {reportType === "orders" && (
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
            )}

            {reportType === "visits" && (
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Locations</p>
                    <p className="text-xl font-bold text-blue-600 truncate">
                      {reports.reduce(
                        (sum, r) => sum + r.uniqueCustomersCount,
                        0
                      )}
                    </p>
                  </div>
                  <MapPinIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                </div>
              </div>
            )}

            {/* <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Avg Order</p>
                  <p className="text-xl font-bold text-blue-600 truncate">
                    {formatCurrency(summary.avgOrderValueAll)}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
              </div>
            </div> */}
          </div>
        )}

        {/* Godown Selector - Cards (matches OrdersPage design) */}
        {godowns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">
                {reportType === "orders" ? "Orders on Godown" : "Visits on Godown"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                      All {reportType === "orders" ? "Orders" : "Visits"}
                      {reportType === "orders" ? (
                        <span className="text-[10px] text-blue-700 bg-blue-100 rounded px-1.5 py-0.5">
                          Orders:{" "}
                          {godowns.reduce(
                            (sum, x) => sum + (x?.orderCount || 0),
                            0
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                          Visits:{" "}
                          {godowns.reduce(
                            (sum, x) => sum + (x?.visitCount || 0),
                            0
                          )}
                        </span>
                      )}
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
                           {reportType === "orders" ? "Orders" : "Visits"}:{" "}
                           {(reportType === "orders"
                             ? g.orderCount
                             : g.visitCount) || 0}
                         </span>
                       </p>
                       <div className="flex items-center gap-2">
                         <p className="text-xs text-gray-500">
                           {g.location?.city || 'Location'}
                         </p>
                       </div>
                     </div>
                  </div>
                </button>
              ))}
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
            {(startDate || endDate || department !== "Sales") && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                !
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filters - Mobile Optimized */}
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
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Production">Production</option>
                    <option value="Management">Management</option>
                    <option value="Admin">Admin</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportType === "orders" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {/* {reportType === 'orders' ? (
                      <> */}
                      <option value="totalRevenue">Total Revenue</option>
                      <option value="totalOrders">Total Orders</option>
                      <option value="avgOrderValue">Avg Order Value</option>
                      <option value="conversionRate">Conversion Rate</option>
                      <option value="uniqueCustomersCount">
                        Unique Customers
                      </option>
                      {/* </>
                    ) : (
                      <>
                        <option value="totalOrders">Total Visits</option>
                        <option value="uniqueCustomersCount">Unique Locations</option>
                        <option value="conversionRate">Completion Rate</option>
                      </>
                    )} */}
                    </select>
                  </div>
                ) : null}
                {reportType === "orders" ? (
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
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
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
          </div>
        )}

        {/* Mobile Cards View */}
        <div className="block lg:hidden space-y-3 mb-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/reports/sales-executives/${report._id}?type=${reportType}`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                  >
                    {report.executiveName}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {report.employeeId}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {report.department} • {report.position}
                  </div>
                </div>
                <Link
                  to={`/reports/sales-executives/${report._id}?type=${reportType}`}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">
                    {reportType === "orders" ? "Orders" : "Visits"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {report.totalOrders}
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-500">
                    {reportType === "orders" ? "Customers" : "Locations"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {report.uniqueCustomersCount}
                  </div>
                </div>
                {reportType === "orders" && (
                  <>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-green-600">Revenue</div>
                      <div className="text-sm font-semibold text-green-700">
                        {formatCurrency(report.totalRevenue)}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="text-xs text-orange-600">Outstanding</div>
                      <div className="text-sm font-semibold text-orange-700">
                        {formatCurrency(report.totalOutstanding)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {reportType === "orders" && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    Avg: {formatCurrency(report.avgOrderValue)}
                  </div>
                  <Badge
                    variant={
                      report.conversionRate >= 70
                        ? "success"
                        : report.conversionRate >= 40
                        ? "warning"
                        : "error"
                    }
                  >
                    {report.conversionRate}%
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {reportType === "orders" ? "Pending:" : "Pending Visits:"}
                  </span>
                  <span className="font-medium">{report.pendingOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {reportType === "orders"
                      ? "Completed:"
                      : "Completed Visits:"}
                  </span>
                  <span className="font-medium text-green-600">
                    {report.completedOrders}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No Reports Found
              </h3>
              <p className="text-xs text-gray-500">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200">
          <Table
            columns={columns}
            data={reports}
            emptyMessage="No sales executive reports found"
          />
        </div>
      </div>
    </div>
  );
};

export default SalesExecutiveReportsPage;
