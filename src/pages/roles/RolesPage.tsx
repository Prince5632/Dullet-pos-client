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
        setTotalRoles(response.pagination?.totalRoles || 0);
        setTotalPages(response.pagination?.totalPages || 1);
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
      label: 'Select',
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
        <div className="flex items-center space-x-3">
          <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{role.name}</span>
              {role.isDefault && (
                <Badge variant="success" size="sm">Default</Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">{role.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (_, role) => (
        <div className="flex items-center space-x-2">
          <Badge variant="info" size="sm">
            {role.permissions?.length || 0} permissions
          </Badge>
        </div>
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
      key: 'createdAt',
      label: 'Created',
      render: (_, role) => (
        <div className="text-sm text-gray-500">
          {formatDate(role.createdAt)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, role) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/roles/${role._id}`}
            className="text-blue-600 hover:text-blue-900 transition-colors"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            to={`/roles/${role._id}/edit`}
            className="text-green-600 hover:text-green-900 transition-colors"
            title="Edit Role"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          {!role.isDefault && (
            <button
              onClick={() => {
                setRoleToDelete(role);
                setDeleteModalOpen(true);
              }}
              className="text-red-600 hover:text-red-900 transition-colors"
              title="Delete Role"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="mt-2 text-gray-600">
            Manage roles and their permissions across your organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Bulk Actions Toggle */}
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium transition-colors ${
              showBulkActions
                ? 'text-blue-700 bg-blue-50 border-blue-300'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4 mr-2" />
            Bulk Actions
          </button>

          {/* Add Role Button */}
          <Link
            to="/roles/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Role
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={handleSearch}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedRoles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkActivate}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  Activate
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <TrashIcon className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedRoles(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-700">
            {loading ? (
              'Loading...'
            ) : (
              <>
                Showing {roles.length} of {totalRoles} roles
                {hasActiveFilters && ' (filtered)'}
              </>
            )}
          </p>
          {showBulkActions && roles.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedRoles.size === roles.length && roles.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Select All</label>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Table
        data={roles}
        columns={columns}
        loading={loading}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRoles}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
