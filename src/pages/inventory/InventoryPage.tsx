import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import type { Inventory, TableColumn, Godown, InventoryListParams } from '../../types';
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon, XMarkIcon, CubeIcon, TrashIcon, EyeIcon, PencilIcon, BuildingOfficeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

const InventoryPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inventoryType, setInventoryType] = useState('');
  const [godownFilter, setGodownFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loggedBy, setLoggedBy] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInventory, setTotalInventory] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState<Inventory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  const loadGodowns = async () => {
    try {
      const response = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
      if (response.success && response.data) {
        setGodowns(response.data.godowns);
      }
    } catch (err) {
      console.error("Failed to load godowns:", err);
    }
  };

  const loadInventory = async () => {
    if (!hasPermission("stock.read")) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: InventoryListParams = {
        page,
        limit,
        search: debouncedSearch,
        inventoryType: inventoryType,
        godown: godownFilter,
        dateFrom: dateFrom,
        dateTo: dateTo,
        loggedBy: loggedBy,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const res = await inventoryService.getInventories(params);
      if (res.success && res.data) {
        setInventory(res.data?.inventory || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalInventory(res.data?.pagination?.totalRecords || 0);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sync functionality
  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        loadInventory(),
        loadGodowns()
      ]);
    } catch (error) {
      console.error("Failed to sync inventory data:", error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadGodowns();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadInventory, 100);
    return () => clearTimeout(t);
  }, [page, limit, debouncedSearch, inventoryType, godownFilter, dateFrom, dateTo, loggedBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch, inventoryType, godownFilter, dateFrom, dateTo, loggedBy]);

  const handleDeleteInventory = async () => {
    if (!inventoryToDelete) return;

    try {
      setDeleteLoading(true);
      await inventoryService.deleteInventory(inventoryToDelete._id);
      toast.success('Inventory item deleted successfully');
      setDeleteModalOpen(false);
      setInventoryToDelete(null);
      loadInventory(); // Reload the inventory list
    } catch (error: any) {
      console.error('Failed to delete inventory:', error);
      toast.error(error.message || 'Failed to delete inventory item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Inventory>[] = useMemo(() => [
    {
      key: 'stockId',
      label: 'Stock ID',
      render: (value) => <span className="text-xs font-mono text-gray-900">{value}</span>,
    },
    {
      key: 'inventoryType',
      label: 'Type',
      render: (value) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          value === 'New Stock' ? 'bg-green-100 text-green-800' :
          value === 'Stock Sold' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'dateOfStock',
      label: 'Date',
      render: (value) => <span className="text-xs text-gray-700">{inventoryService.formatDate(value)}</span>,
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (value, item) => <span className="text-xs text-gray-700">{inventoryService.formatQuantityWithUnit(value, item.unit)}</span>,
    },
    {
      key: 'godown',
      label: 'Godown',
      render: (value) => <span className="text-xs text-gray-700">{value?.name || 'N/A'}</span>,
    },
    {
      key: 'loggedBy',
      label: 'Logged By',
      render: (value) => {
        return(
        <div className="flex items-center gap-2">
          <Avatar name={value?.firstName + " " + value?.lastName || 'User'} size="sm" />
          <span className="text-xs text-gray-700">{value?.firstName + " " + value?.lastName|| 'Unknown'}</span>
        </div>
      )},
    },
    {
      key: 'actions',
      label: '',
      render: (_, item) => (
        <div className="flex items-center justify-end gap-1">
          {hasPermission("stock.read") && (
            <Link to={`/inventory/${item._id}`} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-md text-xs">View</Link>
          )}
          {hasPermission("stock.update") && (
            <Link to={`/inventory/edit/${item._id}`} className="px-2 py-1 text-gray-700 hover:bg-gray-50 rounded-md text-xs">Edit</Link>
          )}
          {hasPermission("stock.delete") && (
            <button
              onClick={() => {
                setInventoryToDelete(item);
                setDeleteModalOpen(true);
              }}
              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md text-xs transition-colors"
              title="Delete Inventory"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ], [hasPermission]);

  if (!hasPermission("stock.read")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view inventory management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage stock inventory and track movements</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex gap-1 cursor-pointer items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync Inventory Data"
              >
                <ArrowPathIcon 
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} 
                /> Sync
              </button>
              {hasPermission("stock.create") && (
                <Link to="/inventory/add" className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Add Stock</span>
                  <span className="sm:hidden">Add</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5">
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  showFilters ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <select value={inventoryType} onChange={(e) => setInventoryType(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="">All Types</option>
                  <option value="New Stock">New Stock</option>
                  <option value="Stock Sold">Stock Sold</option>
                  <option value="Damaged / Return">Damaged / Return</option>
                </select>
                <select value={godownFilter} onChange={(e) => setGodownFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  <option value="">All Godowns</option>
                  {godowns.map(g => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Date From" className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Date To" className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <input value={loggedBy} onChange={(e) => setLoggedBy(e.target.value)} placeholder="Logged By" className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            )}
          </div>
        </div>

        {(currentUser?.role?.name?.toLowerCase() === "super admin" ||
          currentUser?.role?.name?.toLowerCase() === "admin") && (
          <>
            {/* Godown Selector - Cards (matches OrdersPage design) */}
            {godowns.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">
                    Select Godown
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                          All Inventory
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                            Stock: {totalInventory}
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
                              Stock: {g.inventoryCount || 0}
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
          </>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">Total Inventory</div>
            <div className="text-sm font-semibold">{totalInventory}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">On This Page</div>
            <div className="text-sm font-semibold text-emerald-600">{inventory.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {inventory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <CubeIcon className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">No inventory items found</p>
                  </div>
                ) : (
                  inventory.map((item) => (
                    <div key={item._id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <CubeIcon className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{item.stockId}</h3>
                            <p className="text-xs text-gray-500">{inventoryService.formatDate(item.dateOfStock)}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.inventoryType === 'New Stock' ? 'bg-green-100 text-green-800' :
                          item.inventoryType === 'Stock Sold' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.inventoryType}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Quantity:</span>
                          <span className="text-gray-900">{inventoryService.formatQuantityWithUnit(item.quantity, item.unit)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Godown:</span>
                          <span className="text-gray-900">{item.godown?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Logged By:</span>
                          <span className="text-gray-900">{item.loggedBy?.firstName + " " + item?.loggedBy?.lastName || 'Unknown'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {hasPermission("stock.read") && (
                          <Link 
                            to={`/inventory/${item._id}`} 
                            className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            View Details
                          </Link>
                        )}
                        {hasPermission("stock.update") && (
                          <Link 
                            to={`/inventory/edit/${item._id}`} 
                            className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            Edit
                          </Link>
                        )}
                        {hasPermission("stock.delete") && (
                          <button
                            onClick={() => {
                              setInventoryToDelete(item);
                              setDeleteModalOpen(true);
                            }}
                            className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete Inventory"
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
                <Table data={inventory} columns={columns} loading={false} />
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalInventory}
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
            setInventoryToDelete(null);
          }
        }}
        title="Delete Inventory Item"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete Inventory Item</h3>
              <p className="text-xs text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          {inventoryToDelete && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{inventoryToDelete.stockId}</div>
                  <div className="text-xs text-gray-500">{inventoryToDelete.inventoryType}</div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this inventory item? This action will permanently remove the item from the database and cannot be undone.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setInventoryToDelete(null);
              }}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteInventory}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                'Delete Item'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;