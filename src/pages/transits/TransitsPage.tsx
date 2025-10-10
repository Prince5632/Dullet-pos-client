import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { transitService } from "../../services/transitService";
import { godownService } from "../../services/godownService";
import { userService } from "../../services/userService";
import type {
  Transit,
  TableColumn,
  TransitStats,
  Godown,
  User,
} from "../../types";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  TruckIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import TransitStatusDropdown from "../../components/transits/TransitStatusDropdown";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const TransitsPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [transits, setTransits] = useState<Transit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [driverId, setDriverId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransits, setTotalTransits] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<TransitStats | null>(null);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transitToDelete, setTransitToDelete] = useState<Transit | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check if current user is super admin
  const isSuperAdmin = hasRole("Super Admin");

  // Date validation function
  const validateDateRange = (fromDate: string, toDate: string): string => {
    if (!fromDate && !toDate) {
      return ""; // No dates provided, no error
    }
    
    if (fromDate && !toDate) {
      return ""; // Only from date provided, no error
    }
    
    if (!fromDate && toDate) {
      return ""; // Only to date provided, no error
    }
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    // Check if dates are valid
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return "Please enter valid dates";
    }
    
    // Check if from date is later than to date
    if (from > to) {
      return "From date cannot be later than to date";
    }
    
    return "";
  };

  const loadTransits = async () => {
    try {
      setLoading(true);
      
      // Validate date range before making API call
      const dateValidationError = validateDateRange(dateFrom, dateTo);
      setDateError(dateValidationError);
      
      if (dateValidationError) {
        setLoading(false);
        return;
      }
      
      const res = await transitService.getTransits({
        page,
        limit,
        search,
        status,
        fromLocation,
        toLocation,
        driverId,
        assignedTo,
        dateFrom,
        dateTo,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (res.success && res.data) {
        setTransits(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalTransits(res.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error("Failed to load transits:", error);
      toast.error("Failed to load transits");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await transitService.getTransitStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Failed to load transit stats:", error);
    }
  };

  const loadGodowns = async () => {
    try {
      const res = await godownService.getGodowns();
      if (res.success && res.data) {
        setGodowns(res.data.godowns || []);
      }
    } catch (error) {
      console.error("Failed to load godowns:", error);
    }
  };

  const loadManagers = async () => {
    try {
      const res = await userService.getUsers({
        role: "Manager",
        isActive: "true",
        limit: 100,
      });
      if (res.success && res.data) {
        setManagers(res.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load managers:", error);
    }
  };

  const handleTransitUpdate = (updatedTransit: Transit) => {
    handleSync()
  };

  const loadDrivers = async () => {
    try {
      const res = await userService.getUsers({
        role: "Driver",
        isActive: "true",
        limit: 100,
      });
      if (res.success && res.data) {
        setDrivers(res.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load drivers:", error);
    }
  };

  // Sync function to refresh all data
  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        loadTransits(),
        loadStats(),
        loadGodowns(),
        loadManagers(),
        loadDrivers(),
      ]);
    } catch (error) {
      console.error("Failed to sync data:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Clear all filters function
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setFromLocation("");
    setToLocation("");
    setDriverId("");
    setAssignedTo("");
    setDateFrom("");
    setDateTo("");
    setDateError("");
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadTransits();
    }, 100);
    return () => clearTimeout(t);
  }, [
    page,
    limit,
    search,
    status,
    fromLocation,
    toLocation,
    driverId,
    assignedTo,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadStats();
    loadGodowns();
    loadManagers();
    loadDrivers();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [search, status, fromLocation, toLocation, driverId, assignedTo, dateFrom, dateTo]);

  const handleDeleteTransit = async () => {
    if (!transitToDelete) return;

    try {
      setDeleteLoading(true);
      await transitService.deleteTransit(transitToDelete._id);
      toast.success("Transit deleted successfully");
      setDeleteModalOpen(false);
      setTransitToDelete(null);
      loadTransits(); // Reload the transit list
      loadStats(); // Reload stats
    } catch (error: any) {
      console.error("Failed to delete transit:", error);
      toast.error(error.message || "Failed to delete transit");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = transitService.getStatusColor(status);
    const statusText = transitService.getStatusDisplayName(status);

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClasses}`}
      >
        {statusText}
      </span>
    );
  };

  const columns: TableColumn<Transit>[] = useMemo(
    () => [
      {
        key: "transitId",
        label: "Transit ID",
        render: (_, transit) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <TruckIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {transitService.formatTransitId(transit.transitId)}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {transit.vehicleNumber}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "productName",
        label: "Product",
        render: (_, transit) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-gray-500">Products:</span>
            {transit.productDetails?.length > 0 ? (
              transit.productDetails.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-900">
                    {item.productName} ({item.quantity} {item.unit})
                  </span>
                 
                </div>
              ))
            ) : (
              <span className="text-gray-400">No products added</span>
            )}
          </div>
        ),
      },
      {
        key: "route",
        label: "Route",
        render: (_, transit) => (
          <div className="text-xs text-gray-700">
            <div className="truncate">
              {transit.fromLocation} → {transit.toLocation?.name}
            </div>
          </div>
        ),
      },
      {
        key: "dateOfDispatch",
        label: "Dispatch Date",
        render: (value) => (
          <span className="text-xs text-gray-700">{formatDate(value)}</span>
        ),
      },
      {
        key: "expectedArrivalDate",
        label: "Expected Arrival",
        render: (_, transit) => (
          <span className="text-xs text-gray-700">
            {transit.expectedArrivalDate ? formatDate(transit.expectedArrivalDate) : "Not set"}
          </span>
        ),
      },
      {
        key: "driverId",
        label: "Driver",
        render: (_, transit) => (
          <span className="text-xs text-gray-700">
            {typeof transit.driverId === 'object' && transit.driverId?.firstName
              ? transit.driverId?.firstName +  " " + transit.driverId?.lastName
              : "Not assigned"}
          </span>
        ),
      },
      {
        key: "assignedTo",
        label: "Manager",
        render: (_, transit) => (
          <span className="text-xs text-gray-700">
            {typeof transit.assignedTo === 'object' && transit.assignedTo?.firstName
              ? transit.assignedTo?.firstName +  " " + transit.assignedTo?.lastName
              : "Not assigned"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_, transit) => (
          <TransitStatusDropdown
            transit={transit}
            onTransitUpdate={handleTransitUpdate}
            compact={true}
          />
        ),
      },
      {
        key: "actions",
        label: "",
        render: (_, transit) => (
          <div className="flex items-center justify-end gap-1">
            <Link
              to={`/transits/${transit._id}`}
              className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-md text-xs"
            >
              View
            </Link>
            <Link
              to={`/transits/${transit._id}/edit`}
              className="px-2 py-1 text-gray-700 hover:bg-gray-50 rounded-md text-xs"
            >
              Edit
            </Link>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setTransitToDelete(transit);
                  setDeleteModalOpen(true);
                }}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md text-xs transition-colors"
                title="Delete Transit"
              >
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [isSuperAdmin]
  );

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "Pending", label: "Pending" },
    { value: "In Transit", label: "In Transit" },
    { value: "Received", label: "Received" },
    { value: "Partially Received", label: "Partially Received" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Transits
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Manage and track product transits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Sync</span>
              </button>
              <Link
                to="/transits/create"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Add Transit</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Total Transits</div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.total}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-semibold text-yellow-600">
                {stats.pending}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">In Transit</div>
              <div className="text-lg font-semibold text-blue-600">
                {stats.inTransit}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Received</div>
              <div className="text-lg font-semibold text-green-600">
                {stats.received}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Partially Received</div>
              <div className="text-lg font-semibold text-orange-600">
                {stats.partiallyReceived}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Cancelled</div>
              <div className="text-lg font-semibold text-red-600">
                {stats.cancelled}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    showFilters
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <FunnelIcon className="h-3.5 w-3.5" />
                  Filters
                </button>
                {(search ||
                  status ||
                  fromLocation ||
                  toLocation ||
                  driverId ||
                  assignedTo ||
                  dateFrom ||
                  dateTo) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {dateError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600">{dateError}</p>
                  </div>
                )}
                
                {/* Main Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">From Location</label>
                    <input
                      type="text"
                      placeholder="Search location..."
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">To Location</label>
                    <select
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All To Locations</option>
                      {godowns.map((godown) => (
                        <option key={godown._id} value={godown._id}>
                          {godown.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">Manager</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Managers</option>
                      {managers.map((manager) => (
                        <option
                          key={manager._id}
                          value={`${manager.firstName} ${manager.lastName}`}
                        >
                          {manager.firstName} {manager.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">Driver</label>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Drivers</option>
                      {drivers.map((driver) => (
                        <option key={driver._id} value={driver._id}>
                          {driver.firstName} {driver.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Date Range Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setDateError("");
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-medium">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setDateError("");
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">
              {status
                ? `${
                    statusOptions.find((s) => s.value === status)?.label
                  } Transits`
                : "Total Transits"}
            </div>
            <div className="text-sm font-semibold">{totalTransits}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">On This Page</div>
            <div className="text-sm font-semibold text-blue-600">
              {transits.length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {transits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <TruckIcon className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">No transits found</p>
                  </div>
                ) : (
                  transits.map((transit) => (
                    <div key={transit._id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TruckIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {transitService.formatTransitId(
                                transit.transitId
                              )}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {transit.vehicleNumber}
                            </p>
                          </div>
                        </div>
                        <TransitStatusDropdown
                          transit={transit}
                          onTransitUpdate={handleTransitUpdate}
                          compact={true}
                        />
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-gray-500">Products:</span>
                          {transit.productDetails?.length > 0 ? (
                            transit.productDetails.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <span className="text-gray-900">
                                  {item.productName} ({item.quantity}{" "}
                                  {item.unit})
                                </span>
                                
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">
                              No products added
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Route:</span>
                          <span className="text-gray-900">
                            {transit.fromLocation} →{" "}
                            {transit.toLocation?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Dispatch:</span>
                          <span className="text-gray-900">
                            {formatDate(transit.dateOfDispatch)}
                          </span>
                        </div>
                        {transit.expectedArrivalDate && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 w-16">
                              Expected:
                            </span>
                            <span className="text-gray-900">
                              {formatDate(transit.expectedArrivalDate)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Driver:</span>
                          <span className="text-gray-900">
                            {typeof transit.driverId === 'object' && transit.driverId?.firstName 
                              ? transit.driverId?.firstName +  " " + transit.driverId?.lastName
                              : "Not assigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Manager:</span>
                          <span className="text-gray-900">
                            {typeof transit.assignedTo === 'object' && transit.assignedTo?.firstName 
                              ? transit.assignedTo?.firstName +  " " + transit.assignedTo?.lastName
                              : "Not assigned"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/transits/${transit._id}`}
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          View Details
                        </Link>
                        <Link
                          to={`/transits/${transit._id}/edit`}
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Edit
                        </Link>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setTransitToDelete(transit);
                              setDeleteModalOpen(true);
                            }}
                            className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete Transit"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table data={transits} columns={columns} loading={false} />
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalTransits}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={setLimit}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setTransitToDelete(null);
          }
        }}
        title="Delete Transit"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Delete Transit
              </h3>
              <p className="text-xs text-gray-500">
                This action cannot be undone
              </p>
            </div>
          </div>

          {transitToDelete && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TruckIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {transitService.formatTransitId(transitToDelete.transitId)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {transitToDelete.productName} -{" "}
                    {transitToDelete.vehicleNumber}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this transit? This action will
            permanently remove the transit from the database and cannot be
            undone.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setTransitToDelete(null);
              }}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTransit}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                "Delete Transit"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransitsPage;
