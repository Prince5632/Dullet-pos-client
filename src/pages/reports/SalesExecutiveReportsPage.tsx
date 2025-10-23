import React, { useState, useEffect, useRef, useCallback } from "react";
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
  BuildingOffice2Icon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { getSalesExecutiveReports, exportSalesExecutiveReportsToExcel } from "../../services/reportService";
import { godownService } from "../../services/godownService";
import type { SalesExecutiveReportResponse } from "../../services/reportService";
import { persistenceService, PERSIST_NS, clearOtherNamespaces } from "../../services/persistenceService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { formatCurrency, formatDate } from "../../utils";
import type { Role } from "../../types";
import roleService from "../../services/roleService";

type ReportType = "orders" | "visits";

const SalesExecutiveReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] =
    useState<SalesExecutiveReportResponse | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState("desc");
  const [department, setDepartment] = useState("");
  const [godowns, setGodowns] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [godownId, setGodownId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRangeError, setDateRangeError] = useState("");
  const [reportType, setReportType] = useState<ReportType>("");
  const [syncing, setSyncing] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const initRef = useRef(false);

  // Load persisted state on mount and clear other namespaces
  useEffect(() => {
    clearOtherNamespaces(PERSIST_NS.SALES_EXEC_REPORTS);
    const persistedFilters = persistenceService.getNS<any>(PERSIST_NS.SALES_EXEC_REPORTS, 'filters', {
      startDate: "",
      endDate: "",
      department: "",
      godownId: "",
      selectedRoles: [],
      showFilters: false,
      reportType: "orders",
      activeQuickFilter: null,
    });
    const persistedSort = persistenceService.getNS<any>(PERSIST_NS.SALES_EXEC_REPORTS, 'sort', {
      sortBy: "totalRevenue",
      sortOrder: "desc",
    });

    setStartDate(persistedFilters.startDate || "");
    setEndDate(persistedFilters.endDate || "");
    setDepartment(persistedFilters.department || "");
    setGodownId(persistedFilters.godownId || "");
    setSelectedRoles(persistedFilters.selectedRoles || []);
    setShowFilters(!!persistedFilters.showFilters);
    setReportType((persistedFilters.reportType as ReportType) || "orders");
    setSortBy(persistedSort.sortBy || "totalRevenue");
    setSortOrder(persistedSort.sortOrder || "desc");
    setActiveQuickFilter(persistedFilters.activeQuickFilter || null);
    initRef.current = true;
  }, []);

  // Persist filters
  useEffect(() => {
    if (!initRef.current) return;
    persistenceService.setNS(PERSIST_NS.SALES_EXEC_REPORTS, 'filters', {
      startDate,
      endDate,
      department,
      godownId,
      selectedRoles,
      showFilters,
      reportType,
      activeQuickFilter,
    });
  }, [startDate, endDate, department, godownId, selectedRoles, showFilters, reportType, activeQuickFilter]);

  // Persist sort
  useEffect(() => {
    if (!initRef.current) return;
    persistenceService.setNS(PERSIST_NS.SALES_EXEC_REPORTS, 'sort', { sortBy, sortOrder });
  }, [sortBy, sortOrder]);

  // Quick date filter helper functions
  const getQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  const loadRoles = useCallback(async () => {
    try {
      const roleList = await roleService.getSimpleRoles();
      setRoles(roleList);
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  }, []);
  const getQuickDateRangeMonth = (months: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const getQuickDateRangeYear = (years: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - years);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const handleQuickFilter = (type: 'days' | 'months' | 'years', value: number) => {
    const filterKey = `${type}-${value}`;
    
    // Check if this filter is already active - if so, deactivate it
    if (activeQuickFilter === filterKey) {
      setActiveQuickFilter(null);
      setStartDate('');
      setEndDate('');
      setDateRangeError('');
      
      // Apply filters without date range
      const params = {
        sortBy,
        sortOrder,
        ...(department && { department }),
        ...(godownId && { godownId }),
        ...(selectedRoles.length > 0 && { roleIds: selectedRoles }),
        type: reportType === "orders" ? "order" : "visit"
      };
      
      fetchReports(params);
      fetchGodowns({});
      return;
    }
    
    // Activate the new filter
    setActiveQuickFilter(filterKey);
    
    let dateRange;
    
    if (type === 'days') {
      dateRange = getQuickDateRange(value);
    } else if (type === 'months') {
      dateRange = getQuickDateRangeMonth(value);
    } else {
      dateRange = getQuickDateRangeYear(value);
    }
    
    setStartDate(dateRange.startDate);
    setEndDate(dateRange.endDate);
    setDateRangeError('');
    
    // Apply filters immediately
    const params = {
      sortBy,
      sortOrder,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(department && { department }),
      ...(godownId && { godownId }),
      ...(selectedRoles.length > 0 && { roleIds: selectedRoles }),
      type: reportType === "orders" ? "order" : "visit"
    };
    
    fetchReports(params);
    fetchGodowns(dateRange);
  };

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  // Persisted above; no separate localStorage write needed

  useEffect(() => {
    fetchReports();
  }, [godownId]);

  useEffect(() => {
    fetchReports();
  }, [department]);

  useEffect(() => {
    fetchReports();
    fetchGodowns();
  }, [selectedRoles]);

  const fetchGodowns = async (overrideDates?: { startDate?: string; endDate?: string }) => {
    try {
      // Build filter parameters for godown counts
      const params: any = {};
      params.onlySalesExecutive = true;
      const effectiveStartDate = overrideDates?.startDate !== undefined ? overrideDates.startDate : startDate;
      const effectiveEndDate = overrideDates?.endDate !== undefined ? overrideDates.endDate : endDate;
      
      if (effectiveStartDate) params.dateFrom = effectiveStartDate;
      if (effectiveEndDate) params.dateTo = effectiveEndDate;
      if (selectedRoles.length > 0) params.roleIds = selectedRoles;
      // Pass department to ensure consistent counts with reports (only if specified)
      if (department) params.department = department;
      // Note: Don't pass godownId here as we want counts for all godowns
      
      const resp = await godownService.getGodowns(params);
      setGodowns(resp.data?.godowns || []);
    } catch (error) {
      console.error("Error fetching godowns:", error);
    }
  };

  const fetchReports = async (overrideParams?: any) => {
    try {
      setLoading(true);
      if(!reportType) return 
      const params: any = overrideParams || { 
        sortBy, 
        sortOrder, 
        ...(department && { department }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(godownId && { godownId }),
        ...(selectedRoles.length > 0 && { roleIds: selectedRoles })
      };

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

  // Handle sync functionality
  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        fetchReports(),
        fetchGodowns()
      ]);
    } catch (error) {
      console.error("Failed to sync sales executive reports data:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Date validation functions
  const validateDateRange = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setDateRangeError("Start date cannot be after end date");
        return false;
      }
    }
    setDateRangeError("");
    return true;
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
    validateDateRange(value, endDate);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setActiveQuickFilter(null); // Clear active quick filter when manually changing dates
    validateDateRange(startDate, value);
  };

  useEffect(() => {
    // Load godowns for filter on component mount
    fetchGodowns();
    loadRoles();
  }, []);

  useEffect(() => {
    // Refetch godowns when date filters change to update counts
    fetchGodowns();
  }, [startDate, endDate, reportType]);

  const handleApplyFilters = () => {
    fetchReports();
    fetchGodowns(); // Update godown counts with applied filters
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSortBy("totalRevenue");
    setSortOrder("desc");
    setDepartment("");
    setGodownId("");
    setSelectedRoles([]);
    setActiveQuickFilter(null); // Clear active quick filter
    
    // Fetch reports with reset values immediately
    const resetParams = {
      sortBy: "totalRevenue",
      sortOrder: "desc",
      department: ""
      // startDate, endDate, godownId, and selectedRoles are intentionally omitted (reset to empty)
    };
    fetchReports(resetParams);
    fetchGodowns({ startDate: "", endDate: "" });
  };

  const exportToExcel = async () => {
    if (!reportData?.reports) return;

    try {
      // Build the same params used for fetching reports
      const params: any = {
        sortBy,
        sortOrder,
        type: reportType === "orders" ? "order" : "visit",
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (department) params.department = department;
      if (godownId) params.godownId = godownId;
      if (selectedRoles.length > 0) params.roleIds = selectedRoles;

      // Call backend Excel export API
      await exportSalesExecutiveReportsToExcel(params);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data to Excel. Please try again.");
    }
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
                <h1 className="text-lg font-semibold text-gray-900">Sales Executive Reports</h1>
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
                title="Sync Reports Data"
              >
                <ArrowPathIcon 
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} 
                /> Sync
              </button>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

         

          {/* Sub-tabs for Orders vs Visits */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() =>{ 
                if(reportType !== "orders"){
                  handleResetFilters()
                }
                setReportType("orders")}}
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
              onClick={() => {
                if(reportType !== "visits"){
                  handleResetFilters()
                }
                setReportType("visits")}}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
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

        {/* Quick Date Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Date Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 0)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-0'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 7)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-7'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('days', 15)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'days-15'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last 15 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter('months', 1)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeQuickFilter === 'months-1'
                  ? 'bg-blue-600 text-white border border-blue-600 shadow-md'
                  : 'text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Last Month
            </button>
          </div>
        </div>

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
            {(startDate || endDate || department !== "" || selectedRoles.length > 0) && (
              <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {[startDate, endDate, department, ...(selectedRoles.length > 0 ? [`${selectedRoles.length} roles`] : [])].filter(Boolean).length}
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
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
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      dateRangeError 
                        ? "border-red-300 focus:ring-red-500" 
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                </div>
                
                {/* Date Range Error Message */}
                {dateRangeError && (
                  <div className="col-span-2 flex items-center text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {dateRangeError}
                  </div>
                )}
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
                    <option value="">Choose department</option>
                    <option value="Sales">Sales</option>
                    <option value="Production">Production</option>
                    <option value="Management">Management</option>
                    <option value="Admin">Admin</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              {/* Roles Multi-Select */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Roles
                </label>
                <div className="relative">
                  <div className="w-full min-h-[38px] px-2 py-1.5 text-sm border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                    {selectedRoles.length === 0 ? (
                      <span className="text-gray-500">Select roles...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedRoles.map((roleId) => {
                          const role = roles.find(r => r._id === roleId);
                          return (
                            <span
                              key={roleId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md"
                            >
                              {role?.name || roleId}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRoles(prev => prev.filter(id => id !== roleId));
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                    {roles.map((role) => (
                      <label
                        key={role._id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles(prev => [...prev, role._id]);
                            } else {
                              setSelectedRoles(prev => prev.filter(id => id !== role._id));
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </label>
                    ))}
                    {roles.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No roles available
                      </div>
                    )}
                  </div>
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
