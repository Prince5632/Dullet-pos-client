import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { Customer, TableColumn } from '../../types';
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon, XMarkIcon, BuildingOfficeIcon, TrashIcon } from '@heroicons/react/24/outline';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CustomersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  useEffect(() => {
    const t = setTimeout(loadCustomers, 100);
    return () => clearTimeout(t);
  }, [page, limit, search, type, status, stateFilter, city]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [search, type, status, stateFilter, city]);

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
            <Link to="/customers/create" className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <PlusIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Link>
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

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  showFilters ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                          <span className="text-gray-500 w-16">Type:</span>
                          <span className="text-gray-900">{customer.customerType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-16">Location:</span>
                          <span className="text-gray-900">{customer.address?.city}, {customer.address?.state}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 w-16">Phone:</span>
                            <span className="text-gray-900">{customer.phone}</span>
                          </div>
                        )}
                        {customer.location && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 w-16">Map:</span>
                            <a href={customer.location} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              View Location
                            </a>
                          </div>
                        )}
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


