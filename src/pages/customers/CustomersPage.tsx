import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import { godownService } from '../../services/godownService';
import type { Customer, TableColumn, Godown } from '../../types';
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon, XMarkIcon, BuildingOfficeIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { persistenceService, PERSIST_NS, clearOtherNamespaces } from '../../services/persistenceService';

const CustomersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  type CustomersFilters = {
    search: string;
    type: string;
    stateFilter: string;
    city: string;
    status: string;
    dateFrom?: string;
    dateTo?: string;
    showFilters: boolean;
    godownId?: string;
  };

  const {
    filters,
    setFilters,
    pagination,
    setPagination,
    // sort not used dynamically here but kept for consistency
  } = usePersistedFilters<CustomersFilters>({
    namespace: 'customers',
    defaultFilters: {
      search: '',
      type: '',
      stateFilter: '',
      city: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      showFilters: false,
      godownId: '',
    },
    defaultPagination: { page: 1, limit: 10 },
    defaultSort: { sortBy: 'businessName', sortOrder: 'asc' },
  });

  const search = filters.search;
  const setSearch = (v: string) => setFilters({ search: v });
  const type = filters.type;
  const setType = (v: string) => setFilters({ type: v });
  const stateFilter = filters.stateFilter;
  const setStateFilter = (v: string) => setFilters({ stateFilter: v });
  const city = filters.city;
  const setCity = (v: string) => setFilters({ city: v });
  const status = filters.status;
  const setStatus = (v: string) => setFilters({ status: v });
  const dateFrom = filters.dateFrom || '';
  const setDateFrom = (v: string) => setFilters({ dateFrom: v });
  const dateTo = filters.dateTo || '';
  const setDateTo = (v: string) => setFilters({ dateTo: v });
  const godownId = filters.godownId || '';
  const setGodownId = (v: string) => setFilters({ godownId: v });
  const page = pagination.page;
  const setPage = (p: number) => setPagination({ page: p });
  const limit = pagination.limit;
  const setLimit = (l: number) => setPagination({ limit: l });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const showFilters = filters.showFilters;
  const setShowFilters = (v: boolean) => setFilters({ showFilters: v });
  
  // Cross-page reset: visiting Customers clears Orders persisted filters/pagination if present
  useEffect(() => {
    clearOtherNamespaces(PERSIST_NS.CUSTOMERS);
  }, []);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [allCustomerGodowns, setAllCustomerGodowns] = useState<string | number>("");

  // Check if current user is super admin
  const isSuperAdmin = hasRole('Super Admin');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        page,
        limit,
        search,
        customerType: type,
        isActive: status,
        state: stateFilter,
        city: city,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        godownId: godownId || undefined,
        sortBy: 'businessName',
        sortOrder: 'asc',
      });
      if (res.success && res.data) {
        setCustomers(res.data.customers || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCustomers(res.pagination?.totalRecords || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync function to refresh all data
  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadCustomers();
    } catch (error) {
      console.error("Failed to sync data:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch godowns
  const fetchGodowns = async () => {
    try {
      const params: any = {};
      // Pass customer filters to godown API for accurate customer counts
      if (search) params.customerSearch = search;
      if (type) params.customerType = type;
      if (status) params.customerIsActive = status;
      if (stateFilter) params.customerState = stateFilter;
      if (city) params.customerCity = city;
      if (dateFrom) params.customerDateFrom = dateFrom;
      if (dateTo) params.customerDateTo = dateTo;

      const resp = await godownService.getGodowns(params);
      setGodowns(resp.data?.godowns || []);
      setAllCustomerGodowns(resp.data?.allCustomerCount || 0);
    } catch (error) {
      console.error("Error fetching godowns:", error);
    }
  };

  // Clear all filters function
  const clearFilters = () => {
    // Clear persisted filters and reset pagination to defaults
    setFilters({ search: '', type: '', stateFilter: '', city: '', status: '', dateFrom: '', dateTo: '', showFilters: false, godownId: '' });
    setPagination({ page: 1 });
  };

  useEffect(() => {
    const t = setTimeout(loadCustomers, 100);
    return () => clearTimeout(t);
  }, [page, limit, search, type, status, stateFilter, city, dateFrom, dateTo, godownId]);

  // Fetch godowns when any customer filter changes
  useEffect(() => {
    fetchGodowns();
  }, [search, type, status, stateFilter, city, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (page !== 1) {
      setPage(1);
    }
  }, [search, type, status, stateFilter, city, dateFrom, dateTo, godownId]);

  // Client-side date validation feedback
  const [dateError, setDateError] = useState<string>('');

  useEffect(() => {
    // Reset error if no dates
    if (!dateFrom && !dateTo) {
      setDateError('');
      return;
    }

    // Validate formats (YYYY-MM-DD) and reasonable range
    const isValidFmt = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (dateFrom && !isValidFmt(dateFrom)) {
      setDateError('Invalid From date format. Use YYYY-MM-DD');
      return;
    }
    if (dateTo && !isValidFmt(dateTo)) {
      setDateError('Invalid To date format. Use YYYY-MM-DD');
      return;
    }

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && isNaN(from.getTime())) {
      setDateError('Invalid From date');
      return;
    }
    if (to && isNaN(to.getTime())) {
      setDateError('Invalid To date');
      return;
    }

    if (from && to && from.getTime() > to.getTime()) {
      setDateError('From date cannot be later than To date');
      return;
    }

    // Limit range to 365 days
    if (from && to) {
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        setDateError('Date range too large. Max 365 days');
        return;
      }
    }

    // Prevent future date for To
    if (to && to.getTime() > Date.now()) {
      setDateError('To date cannot be in the future');
      return;
    }

    setDateError('');
  }, [dateFrom, dateTo]);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setDeleteLoading(true);
      await customerService.deleteCustomer(customerToDelete._id);
      toast.success('Customer deleted successfully');
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      loadCustomers(); // Reload the customer list
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      toast.error(error.message || 'Failed to delete customer');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: TableColumn<Customer>[] = useMemo(() => [
    {
      key: 'businessName',
      label: 'Customer',
      render: (_, customer) => (
        <div className="flex items-center gap-2">
          <Avatar name={customer.businessName} size="sm" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{customer.businessName}</div>
            <div className="text-xs text-gray-500 truncate">
              {customer.location ? (
                <a href={customer.location} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View Location
                </a>
              ) : (
                customer.phone
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'customerId',
      label: 'ID',
      render: (value) => <span className="text-xs text-gray-700">{value}</span>,
    },
    {
      key: 'address',
      label: 'Location',
      render: (_, c) => (
        <span className="text-xs text-gray-700">{c.address?.city}, {c.address?.state}</span>
      ),
    },
    {
      key: 'customerType',
      label: 'Type',
      render: (value) => <span className="text-xs text-gray-700">{value}</span>,
    },
    {
      key: 'netBalance',
      label: 'Net Balance',
      render: (_, customer) => {
        const balance = customer.netBalance || 0;
        const isPositive = balance >= 0;
        return (
          <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {!isPositive && ' (Due)'}
          </span>
        );
      },
    },
     {
      key: 'createdBy',
      label: 'Created By',
      render: (_, customer) => {
       
        return (
          <div className='flex items-center gap-2'>
            <Avatar name={customer.createdBy?.firstName + " " + customer.createdBy?.lastName || 'Unknown'} size="sm" />
            <span className="text-xs font-medium text-gray-700">
              {customer.createdBy?.firstName + " " + customer.createdBy?.lastName || 'Unknown'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_, c) => (
        <div className="flex items-center justify-end gap-1">
          <Link to={`/customers/${c._id}`} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-md text-xs">View</Link>
          <Link to={`/customers/${c._id}/edit`} className="px-2 py-1 text-gray-700 hover:bg-gray-50 rounded-md text-xs">Edit</Link>
          {isSuperAdmin && (
            <button
              onClick={() => {
                setCustomerToDelete(c);
                setDeleteModalOpen(true);
              }}
              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md text-xs transition-colors"
              title="Delete Customer"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ], [isSuperAdmin]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Customers</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage and filter customers by location</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
              <Link to="/customers/create" className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </Link>
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
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5">
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Godown Selector */}
            {godowns.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">
                    Filter by Godown
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 gap-2">
                  {/* All Godowns button */}
                  <button
                    type="button"
                    onClick={() => setGodownId("")}
                    className={`text-left rounded-lg border p-2 transition-colors ${
                      godownId === ""
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-100">
                        <BuildingOfficeIcon className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          All Godowns
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {allCustomerGodowns} customers
                        </p>
                      </div>
                    </div>
                  </button>

                  {godowns.map((g) => (
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => setGodownId(g._id)}
                      className={`text-left rounded-lg border p-2 transition-colors ${
                        godownId === g._id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-100">
                          <BuildingOfficeIcon className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {g.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {g.customerCount || 0} customers
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    showFilters ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <FunnelIcon className="h-3.5 w-3.5" />
                  Filters
                </button>
                {(search || type || stateFilter || city || status || dateFrom || dateTo || godownId) && (
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
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <select value={type} onChange={(e) => setType(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {customerService.getCustomerTypes().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All States</option>
                  {customerService.getStates().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From (YYYY-MM-DD)"
                  className={`px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 ${dateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To (YYYY-MM-DD)"
                  className={`px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 ${dateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                />
                {dateError && (
                  <div className="sm:col-span-2 lg:col-span-6 text-[11px] text-red-600 mt-1">{dateError}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">
              {status === "true" ? "Active Customers" : status === "false" ? "Inactive Customers" : "Total Customers"}
            </div>
            <div className="text-sm font-semibold">{totalCustomers}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">On This Page</div>
            <div className="text-sm font-semibold text-blue-600">{customers.length}</div>
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
                {customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500">No customers found</p>
                  </div>
                ) : (
                  customers.map((customer) => (
                    <div key={customer._id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar name={customer.businessName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{customer.businessName}</h3>
                            <p className="text-xs text-gray-500">ID: {customer.customerId}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-18">Type:</span>
                          <span className="text-gray-900">{customer.customerType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-18">Location:</span>
                          <span className="text-gray-900">{customer.address?.city}, {customer.address?.state}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 w-18">Phone:</span>
                            <span className="text-gray-900">{customer.phone}</span>
                          </div>
                        )}
                        {customer.location && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 w-18">Map:</span>
                            <a href={customer.location} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Location
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-18">Net Balance:</span>
                          ₹{Math.abs(customer?.netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}                </div>
                      </div>
                       <div className='flex items-center gap-2 mb-4  text-xs'>
                         <span className="text-gray-500 w-18 ">Created By:</span>
            <Avatar name={customer.createdBy?.firstName + " " + customer.createdBy?.lastName || 'Unknown'} size="sm" />
            <span className="text-xs font-medium text-gray-700">
              {customer.createdBy?.firstName + " " + customer.createdBy?.lastName || 'Unknown'}
            </span>
          </div>
                      
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/customers/${customer._id}`} 
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          View Details
                        </Link>
                        <Link 
                          to={`/customers/${customer._id}/edit`} 
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Edit
                        </Link>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setCustomerToDelete(customer);
                              setDeleteModalOpen(true);
                            }}
                            className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete Customer"
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
                <Table data={customers} columns={columns} loading={false} />
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalCustomers}
                itemsPerPage={limit}
                onPageChange={(p) => setPage(p)}
                onItemsPerPageChange={(l) => setLimit(l)}
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
            setCustomerToDelete(null);
          }
        }}
        title="Delete Customer"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete Customer</h3>
              <p className="text-xs text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          {customerToDelete && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <Avatar name={customerToDelete.businessName} size="sm" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{customerToDelete.businessName}</div>
                  <div className="text-xs text-gray-500">ID: {customerToDelete.customerId}</div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this customer? This action will permanently remove the customer from the database and cannot be undone.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setCustomerToDelete(null);
              }}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCustomer}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                'Delete Customer'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;


