import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { roleService } from '../../services/roleService';
import type { Role, TableColumn } from '../../types';
import { formatDate, debounce } from '../../utils';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

interface RoleListFilters {
  search: string;
  status: string;
}

const RolesPage: React.FC = () => {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRoles, setTotalRoles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState<RoleListFilters>({
    search: '',
    status: '',
  });

  // Status options
  const statusOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ];

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setCurrentPage(1);
    }, 500),
    []
  );

  // Load data
  const loadRoles = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search,
        isActive: filters.status,
      };

      const response = await roleService.getRoles(params);
      
      if (response.success && response.data) {
        setRoles(response.data.roles);
        setTotalRoles(response?.data?.pagination?.totalRoles || 0);
        setTotalPages(response?.data?.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      if (error.name !== 'CanceledError') {
        console.error('Failed to load roles:', error);
        toast.error('Failed to load roles');
      }
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadRoles();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentPage, itemsPerPage, filters]);

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (key: keyof RoleListFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      await roleService.deleteRole(roleToDelete._id);
      toast.success('Role deleted successfully');
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleToggleRoleStatus = async (role: Role) => {
    try {
      if (role.isActive) {
        await roleService.deleteRole(role._id);
        toast.success('Role deactivated successfully');
      } else {
        await roleService.activateRole(role._id);
        toast.success('Role activated successfully');
      }
      loadRoles();
    } catch (error) {
      console.error('Failed to update role status:', error);
      toast.error('Failed to update role status');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
    });
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectRole = (roleId: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRoles.size === roles.length) {
      setSelectedRoles(new Set());
    } else {
      setSelectedRoles(new Set(roles.map(role => role._id)));
    }
  };

  // Bulk operations
  const handleBulkActivate = async () => {
    try {
      setBulkActionLoading(true);
      await roleService.bulkActivateRoles(Array.from(selectedRoles));
      toast.success(`${selectedRoles.size} roles activated successfully`);
      setSelectedRoles(new Set());
      loadRoles();
    } catch (error) {
      console.error('Failed to activate roles:', error);
      toast.error('Failed to activate roles');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);
      await roleService.bulkDeleteRoles(Array.from(selectedRoles));
      toast.success(`${selectedRoles.size} roles deleted successfully`);
      setSelectedRoles(new Set());
      loadRoles();
    } catch (error) {
      console.error('Failed to delete roles:', error);
      toast.error('Failed to delete roles');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Table columns
  const columns: TableColumn<Role>[] = [
    {
      key: 'select',
      label: '',
      render: (_, role) => (
        <input
          type="checkbox"
          checked={selectedRoles.has(role._id)}
          onChange={() => handleSelectRole(role._id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (_, role) => (
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-900 truncate">{role.name}</span>
              {role.isDefault && (
                <Badge variant="success" size="sm">Default</Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{role.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Perms',
      render: (_, role) => (
        <Badge variant="info" size="sm">
          {role.permissions?.length || 0}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, role) => (
        <Badge 
          variant={role.isActive ? 'success' : 'error'} 
          size="sm"
        >
          {role.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, role) => (
        <div className="flex items-center space-x-1">
          <Link
            to={`/roles/${role._id}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="View"
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/roles/${role._id}/edit`}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>
          {!role.isDefault && (
            <button
              onClick={() => {
                setRoleToDelete(role);
                setDeleteModalOpen(true);
              }}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Roles</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage permissions</p>
              </div>
            </div>
            
            {/* <Link
              to="/roles/create"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Role</span>
              <span className="sm:hidden">Add</span>
            </Link> */}
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
              showBulkActions
                ? 'text-blue-700 bg-blue-50 border border-blue-300'
                : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Squares2X2Icon className="h-3.5 w-3.5" />
            Bulk
          </button>
        </div>

        {/* Compact Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            {/* Search Bar */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                onChange={handleSearch}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute right-2.5 top-2.5"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
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
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedRoles.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedRoles.size} selected
              </span>
              <button
                onClick={() => setSelectedRoles(new Set())}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={handleBulkActivate}
                disabled={bulkActionLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 transition-colors"
              >
                <ShieldCheckIcon className="h-3 w-3" />
                Activate
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-sm font-semibold">{totalRoles}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">Active</div>
            <div className="text-sm font-semibold text-green-600">
              {roles.filter(r => r.isActive).length}
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">Default</div>
            <div className="text-sm font-semibold text-blue-600">
              {roles.filter(r => r.isDefault).length}
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Roles Found</h3>
              <p className="text-xs text-gray-500 mb-4">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first role'}
              </p>
              {!hasActiveFilters && (
                <Link
                  to="/roles/create"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create First Role
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {showBulkActions && (
                  <div className="p-3 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRoles.size === roles.length && roles.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-700">Select All</span>
                    </div>
                  </div>
                )}
                
                {roles.map((role) => (
                  <div key={role._id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={selectedRoles.has(role._id)}
                            onChange={() => handleSelectRole(role._id)}
                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <ShieldCheckIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">{role.name}</span>
                            {role.isDefault && (
                              <Badge variant="success" size="sm">Default</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mb-1 line-clamp-2">{role.description}</div>
                          <div className="text-xs text-gray-400">
                            Created {formatDate(role.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <Link
                          to={`/roles/${role._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/roles/${role._id}/edit`}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        {!role.isDefault && (
                          <button
                            onClick={() => {
                              setRoleToDelete(role);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">
                          {role.permissions?.length || 0} perms
                        </Badge>
                        <Badge 
                          variant={role.isActive ? 'success' : 'error'} 
                          size="sm"
                        >
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                {showBulkActions && (
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRoles.size === roles.length && roles.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Select All</span>
                    </div>
                  </div>
                )}
                <Table
                  data={roles}
                  columns={columns}
                  loading={false}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </div>
            </>
          )}

          {/* Compact Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalRoles}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        title="Delete Role"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the role{' '}
            <span className="font-medium">
              {roleToDelete?.name}
            </span>
            ? This action cannot be undone and will affect all users with this role.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setRoleToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Role
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesPage;
