import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { productionService } from "../../services/productionService";
import { userService } from "../../services/userService";
import type {
  Production,
  TableColumn,
  ProductionStats,
  User,
} from "../../types";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  CogIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import {
  persistenceService,
  PERSIST_NS,
  clearOtherNamespaces,
} from "../../services/persistenceService";
import ProductionStatusDropdown from "../../components/productions/ProductionStatusDropdown";

const ProductionsPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("");
  const [location, setLocation] = useState("");
  const [machine, setMachine] = useState("");
  const [operator, setOperator] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductions, setTotalProductions] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [operators, setOperators] = useState<User[]>([]);
  const initRef = useRef(false);

  // New state for unit filtering
  const [unitFilter, setUnitFilter] = useState<string>("");
  const [enhancedStats, setEnhancedStats] = useState<any>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productionToDelete, setProductionToDelete] =
    useState<Production | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check if current user is super admin
  const isSuperAdmin = hasRole("Super Admin");

  // Unit options for filtering
  const unitOptions = [
    { value: "", label: "All Units" },
    { value: "KG", label: "KG" },
    { value: "Quintal", label: "Quintal" },
    { value: "Ton", label: "Ton" },
  ];

  // Unit conversion functions
  const convertToKG = (quantity: number, unit: string): number => {
    switch (unit) {
      case "Ton":
        return quantity * 1000;
      case "Quintal":
        return quantity * 100;
      case "KG":
        return quantity;
      default:
        return quantity; // For bag units, return as is
    }
  };

  const convertFromKG = (quantityInKG: number, targetUnit: string): number => {
    switch (targetUnit) {
      case "Ton":
        return quantityInKG / 1000;
      case "Quintal":
        return quantityInKG / 100;
      case "KG":
        return quantityInKG;
      default:
        return quantityInKG; // For bag units, return as is
    }
  };

  const isWeightUnit = (unit: string): boolean => {
    return ["KG", "Quintal", "Ton"].includes(unit);
  };

  const isBagUnit = (unit: string): boolean => {
    return false;
    // return ['Bags', '5Kg Bags', '40Kg Bags'].includes(unit);
  };

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

  // Calculate enhanced statistics from productions data
  const calculateEnhancedStats = (productionsData: Production[]) => {
    // Convert all weight-based quantities to KG for calculation
    let totalAttaProductionKG = 0;
    let totalChokarProductionKG = 0;
    let totalWastageProductionKG = 0;
    let totalInputConsumptionKG = 0;
    let attaProductionCount = 0;

    // Separate tracking for bags
    let totalAttaBags = 0;
    let totalChokarBags = 0;
    let totalWastageBags = 0;

    const unitBreakdown: {
      [unit: string]: {
        totalQty: number;
        attaQty: number;
        chokarQty: number;
        wastageQty: number;
        bagCount?: number;
      };
    } = {};

    productionsData.forEach((production) => {
      // Convert input to KG for total calculation
      totalInputConsumptionKG += convertToKG(
        production.inputQty,
        production.inputUnit
      );

      production.outputDetails.forEach((output) => {
        const unit = output.productUnit;

        if (!unitBreakdown[unit]) {
          unitBreakdown[unit] = {
            totalQty: 0,
            attaQty: 0,
            chokarQty: 0,
            wastageQty: 0,
          };
        }

        unitBreakdown[unit].totalQty += output.productQty;

        if (output.itemName === "Atta") {
          if (isWeightUnit(unit)) {
            totalAttaProductionKG += convertToKG(output.productQty, unit);
          } else if (isBagUnit(unit)) {
            totalAttaBags += output.productQty;
          }
          unitBreakdown[unit].attaQty += output.productQty;
          attaProductionCount++;
        } else if (output.itemName === "Chokar") {
          if (isWeightUnit(unit)) {
            totalChokarProductionKG += convertToKG(output.productQty, unit);
          } else if (isBagUnit(unit)) {
            totalChokarBags += output.productQty;
          }
          unitBreakdown[unit].chokarQty += output.productQty;
        } else if (output.itemName === "Wastage") {
          if (isWeightUnit(unit)) {
            totalWastageProductionKG += convertToKG(output.productQty, unit);
          } else if (isBagUnit(unit)) {
            totalWastageBags += output.productQty;
          }
          unitBreakdown[unit].wastageQty += output.productQty;
        }

        // For bag units, track bag count
        if (isBagUnit(unit)) {
          if (!unitBreakdown[unit].bagCount) {
            unitBreakdown[unit].bagCount = 0;
          }
          unitBreakdown[unit].bagCount += output.productQty;
        }
      });
    });

    // Convert totals to selected unit or default to KG
    const displayUnit =
      unitFilter && isWeightUnit(unitFilter) ? unitFilter : "KG";
    const totalAttaProduction = convertFromKG(
      totalAttaProductionKG,
      displayUnit
    );
    const totalChokarProduction = convertFromKG(
      totalChokarProductionKG,
      displayUnit
    );
    const totalWastageProduction = convertFromKG(
      totalWastageProductionKG,
      displayUnit
    );
    const totalWastageConsumption = convertFromKG(
      totalWastageProductionKG,
      displayUnit
    );
    const totalInputConsumption = convertFromKG(
      totalInputConsumptionKG,
      displayUnit
    );
    const averageAttaProduction =
      attaProductionCount > 0 ? totalAttaProduction / attaProductionCount : 0;

    return {
      totalAttaProduction,
      totalChokarProduction,
      totalWastageProduction,
      totalInputConsumption,
      averageAttaProduction,
      totalAttaBags,
      totalChokarBags,
      totalWastageBags,
      displayUnit,
      unitBreakdown,
      filteredProductionsCount: productionsData.length,
    };
  };

  const loadProductions = async () => {
    try {
      setLoading(true);

      // Validate date range before making API call
      const dateValidationError = validateDateRange(dateFrom, dateTo);
      setDateError(dateValidationError);

      if (dateValidationError) {
        setLoading(false);
        return;
      }

      const res = await productionService.getProductions({
        page,
        limit,
        search,
        shift,
        location,
        machine,
        operator,
        dateFrom,
        dateTo,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (res.success && res.data) {
        setProductions(res.data || []);
        setTotalPages(res?.pagination?.totalPages || 1);
        setTotalProductions(res.pagination?.totalItems || 0);

        // Calculate enhanced stats from current data
        const enhanced = calculateEnhancedStats(res.data || []);
        setEnhancedStats(enhanced);
      }
    } catch (error) {
      console.error("Failed to load productions:", error);
      toast.error("Failed to load productions");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await productionService.getProductionStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error("Failed to load production stats:", error);
    }
  };

  const loadOperators = async () => {
    try {
      const res = await userService.getUsers({
        role: "Operator",
        isActive: "true",
        limit: 100,
      });
      if (res.success && res.data) {
        setOperators(res.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load operators:", error);
    }
  };

  // Load persisted state on mount and clear other namespaces
  useEffect(() => {
    clearOtherNamespaces(PERSIST_NS.PRODUCTIONS);
    const persistedFilters = persistenceService.getNS<any>(
      PERSIST_NS.PRODUCTIONS,
      "filters",
      {
        search: "",
        shift: "",
        location: "",
        machine: "",
        operator: "",
        dateFrom: "",
        dateTo: "",
        page: 1,
        limit: 10,
        showFilters: false,
        unitFilter: "",
      }
    );

    setSearch(persistedFilters.search);
    setShift(persistedFilters.shift);
    setLocation(persistedFilters.location);
    setMachine(persistedFilters.machine);
    setOperator(persistedFilters.operator);
    setDateFrom(persistedFilters.dateFrom);
    setDateTo(persistedFilters.dateTo);
    setPage(persistedFilters.page);
    setLimit(persistedFilters.limit);
    setShowFilters(persistedFilters.showFilters);
    setUnitFilter(persistedFilters.unitFilter);
  }, []);

  // Save filters to persistence whenever they change
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      return;
    }

    const filters = {
      search,
      shift,
      location,
      machine,
      operator,
      dateFrom,
      dateTo,
      page,
      limit,
      showFilters,
      unitFilter,
    };

    persistenceService.setNS(PERSIST_NS.PRODUCTIONS, "filters", filters);
  }, [
    search,
    shift,
    location,
    machine,
    operator,
    dateFrom,
    dateTo,
    page,
    limit,
    showFilters,
    unitFilter,
  ]);

  // Load data on mount and when filters change
  useEffect(() => {
    if (!initRef.current) return;
    loadProductions();
  }, [
    page,
    limit,
    search,
    shift,
    location,
    machine,
    operator,
    dateFrom,
    dateTo,
  ]);

  // Recalculate enhanced stats when unit filter changes
  useEffect(() => {
    if (productions.length > 0) {
      const enhanced = calculateEnhancedStats(productions);
      setEnhancedStats(enhanced);
    }
  }, [unitFilter, productions]);

  // Load initial data
  useEffect(() => {
    loadStats();
    loadOperators();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (!initRef.current) return;
    if (page !== 1) {
      setPage(1);
    }
  }, [search, shift, location, machine, operator, dateFrom, dateTo]);

  const handleDeleteProduction = async () => {
    if (!productionToDelete) return;

    try {
      setDeleteLoading(true);
      await productionService.deleteProduction(productionToDelete._id);
      toast.success("Production deleted successfully");
      setDeleteModalOpen(false);
      setProductionToDelete(null);
      loadProductions(); // Reload the production list
      loadStats(); // Reload stats
    } catch (error: any) {
      console.error("Failed to delete production:", error);
      toast.error(error.message || "Failed to delete production");
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadProductions();
      await loadStats();
      toast.success("Data synced successfully");
    } catch (error) {
      toast.error("Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setShift("");
    setLocation("");
    setMachine("");
    setOperator("");
    setDateFrom("");
    setDateTo("");
    setDateError("");
    setUnitFilter("");
    setPage(1);
  };

  const columns: TableColumn<Production>[] = useMemo(
    () => [
      {
        key: "batchId",
        label: "Batch ID",
        render: (_, production) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CogIcon className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {productionService.formatBatchId(production.batchId)}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {production.machine}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "outputDetails",
        label: "Output Products",
        render: (_, production) => (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-gray-500">Products:</span>
            {production.outputDetails?.length > 0 ? (
              production.outputDetails.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-900">
                    {item.itemName} ({item.productQty} {item.productUnit})
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
        key: "input",
        label: "Input",
        render: (_, production) => (
          <div className="text-xs text-gray-700">
            <div className="truncate">
              {production.inputType}: {production.inputQty}{" "}
              {production.inputUnit}
            </div>
          </div>
        ),
      },
      {
        key: "productionDate",
        label: "Production Date",
        render: (value) => (
          <span className="text-xs text-gray-700">{formatDate(value)}</span>
        ),
      },
      {
        key: "shift",
        label: "Shift",
        render: (value) => (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${productionService.getShiftColor(
              value
            )}`}
          >
            {productionService.getShiftDisplayName(value)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_, production) => (
          <ProductionStatusDropdown
            onProductionUpdate={() => {
              handleSync();
            }}
            production={production}
          />
        ),
      },
      {
        key: "location",
        label: "Location",
        render: (value) => (
          <div className="min-w-[200px] py-1">
            <span className="text-xs text-gray-500 whitespace-normal break-words">
              {value}
            </span>
          </div>
        ),
      },
      {
        key: "operator",
        label: "Operator",
        render: (_, production) =>
          production.operator ? (
            <div className="flex items-center gap-2">
              <Avatar
                name={production.operator || "Not Assigned"}
                size="sm"
                className="w-6 h-6"
              />
              <span className="text-xs text-gray-700 truncate">
                {production.operator || "Not Assigned"}
              </span>
            </div>
          ) : (
            <div className="flex justify-center items-center gap-2">
              <span className="text-xs text-center text-gray-700 truncate">
                Not Assigned
              </span>
            </div>
          ),
      },

      {
        key: "actions",
        label: "Actions",
        render: (_, production) => (
          <div className="flex items-center gap-1">
            <Link
              to={`/productions/${production._id}`}
              className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Details"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </Link>
            <Link
              to={`/productions/${production._id}/edit`}
              className="inline-flex items-center justify-center w-8 h-8 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Edit Production"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Link>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setProductionToDelete(production);
                  setDeleteModalOpen(true);
                }}
                className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Production"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [isSuperAdmin]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productions</h1>
          <p className="text-sm text-gray-600">
            Manage production records and track manufacturing efficiency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </button>
          <Link
            to="/productions/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            Add Production
          </Link>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="space-y-6">
        {/* Stats Header with Unit Filter */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col  sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Production Statistics
              </h2>
              <p className="text-sm text-gray-600">
                Overview of production performance and metrics
              </p>
            </div>
            <div className="min-w-0 sm:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Unit
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Atta Production */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700">
                    Total Atta Production
                  </p>
                  {unitFilter && isBagUnit(unitFilter) ? (
                    <p className="text-2xl font-bold text-green-900">
                      {enhancedStats?.totalAttaBags?.toLocaleString() || 0} Bags
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-green-900">
                        {enhancedStats?.totalAttaProduction?.toLocaleString() ||
                          0}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        {enhancedStats?.displayUnit || "KG"}
                      </p>
                      {enhancedStats?.totalAttaBags > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                          {enhancedStats.totalAttaBags.toLocaleString()} Bags
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Chokar Production */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">
                    Total Chokar Production
                  </p>
                  {unitFilter && isBagUnit(unitFilter) ? (
                    <p className="text-2xl font-bold text-amber-900">
                      {enhancedStats?.totalChokarBags?.toLocaleString() || 0}{" "}
                      Bags
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-amber-900">
                        {enhancedStats?.totalChokarProduction?.toLocaleString() ||
                          0}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">
                        {enhancedStats?.displayUnit || "KG"}
                      </p>
                      {enhancedStats?.totalChokarBags > 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                          {enhancedStats.totalChokarBags.toLocaleString()} Bags
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
            </div>
            {/* Total Wastage Production */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">
                    Total Wastage Production
                  </p>
                  {unitFilter && isBagUnit(unitFilter) ? (
                    <p className="text-2xl font-bold text-amber-900">
                      {enhancedStats?.totalWastageBags?.toLocaleString() || 0}{" "}
                      Bags
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-amber-900">
                        {enhancedStats?.totalWastageProduction?.toLocaleString() ||
                          0}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">
                        {enhancedStats?.displayUnit || "KG"}
                      </p>
                      {enhancedStats?.totalWastageBags > 0 && (
                        <p className="text-sm text-amber-600 mt-1">
                          {enhancedStats.totalWastageBags.toLocaleString()} Bags
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
            </div>
            {/* Total Input Consumption */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700">
                    Total Input Consumption
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {enhancedStats?.totalInputConsumption?.toLocaleString() ||
                      0}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    {enhancedStats?.displayUnit || "KG"}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {enhancedStats?.filteredProductionsCount || 0} productions
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Average Atta Production */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-700">
                    Average Atta Production
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {enhancedStats?.averageAttaProduction?.toFixed(2) || 0}
                  </p>
                  <p className="text-xs text-purple-600 font-medium">
                    {enhancedStats?.displayUnit || "KG"} per batch
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by batch ID, machine, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {(shift ||
              location ||
              machine ||
              operator ||
              dateFrom ||
              dateTo) && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                {
                  [shift, location, machine, operator, dateFrom, dateTo].filter(
                    Boolean
                  ).length
                }
              </span>
            )}
          </button>

          {/* Clear Filters */}
          {(search ||
            shift ||
            location ||
            machine ||
            operator ||
            dateFrom ||
            dateTo ||
            unitFilter) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Shift Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Shifts</option>
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Machine Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Machine
                </label>
                <input
                  type="text"
                  placeholder="Enter machine"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Operator Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <input
                  type="text"
                  placeholder="Enter operator"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Error */}
            {dateError && (
              <div className="mt-2 text-sm text-red-600">{dateError}</div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {productions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <CogIcon className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-500">No productions found</p>
                </div>
              ) : (
                productions.map((production) => (
                  <div key={production._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CogIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {productionService.formatBatchId(
                              production.batchId
                            )}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {production.machine}
                          </p>
                        </div>
                      </div>
                      <ProductionStatusDropdown
                        production={production}
                        onProductionUpdate={() => {
                          handleSync();
                        }}
                        compact={true}
                      />
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500">Output Products:</span>
                        {production.outputDetails?.length > 0 ? (
                          production.outputDetails.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <span className="text-gray-900">
                                {item.itemName} ({item.productQty}{" "}
                                {item.productUnit})
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
                        <span className="text-gray-500 w-16">Input:</span>
                        <span className="text-gray-900">
                          {production.inputType}: {production.inputQty}{" "}
                          {production.inputUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-16">Date:</span>
                        <span className="text-gray-900">
                          {formatDate(production.productionDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-16">Shift:</span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${productionService.getShiftColor(
                            production.shift
                          )}`}
                        >
                          {productionService.getShiftDisplayName(
                            production.shift
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-16">Location:</span>
                        <span className="text-gray-900">
                          {production.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 w-16">Operator:</span>
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={production.operator || "Unknown"}
                            size="sm"
                            className="w-4 h-4"
                          />
                          <span className="text-gray-900">
                            {production.operator || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/productions/${production._id}`}
                        className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        View Details
                      </Link>
                      <Link
                        to={`/productions/${production._id}/edit`}
                        className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                      >
                        Edit
                      </Link>
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            setProductionToDelete(production);
                            setDeleteModalOpen(true);
                          }}
                          className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          title="Delete Production"
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
              <Table
                columns={columns}
                data={productions}
                loading={false}
                emptyMessage="No productions found"
              />
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsPerPage={limit}
              onItemsPerPageChange={setLimit}
              totalItems={totalProductions}
            />
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Production"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Delete Production Record
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Are you sure you want to delete production{" "}
                <span className="font-medium">
                  {productionToDelete?.batchId}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduction}
              disabled={deleteLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionsPage;
