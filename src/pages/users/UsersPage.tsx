import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { roleService } from '../../services/roleService';
import type { User, Role, TableColumn } from '../../types';
import { formatDate, debounce } from '../../utils';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

interface UserListFilters {
  search: string;
  department: string;
  role: string;
  status: string;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Filters
  const [filters, setFilters] = useState<UserListFilters>({
    search: '',
    department: '',
    role: '',
    status: '',
  });

  // Departments list
  const departments = userService.getDepartments();
  const statusOptions = userService.getStatusOptions();

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setCurrentPage(1);
    }, 500),
    []
  );

  // Load data
  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search,
        department: filters.department,
        role: filters.role,
        isActive: filters.status,
      };

      const response = await userService.getUsers(params);
      
      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalUsers(response.pagination?.totalUsers || 0);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      // Don't show error toast for cancelled requests
      if (error.name !== 'CanceledError') {
        console.error('Failed to load users:', error);
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const allRoles = await roleService.getAllRoles();
      setRoles(allRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  // Effects
  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    // Add a small delay to prevent excessive API calls during rapid filter changes
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentPage, itemsPerPage, filters]);

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (key: keyof UserListFilters, value: string) => {
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete._id);
      toast.success('User deleted successfully');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.isActive) {
        // Deactivate logic would go here
        toast.success('User deactivated successfully');
      } else {
        await userService.activateUser(user._id);
        toast.success('User activated successfully');
      }
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      department: '',
      role: '',
      status: '',
    });
    setCurrentPage(1);
  };

  // Table columns
  const columns: TableColumn<User>[] = [
    {
      key: 'user',
      label: 'User',
      render: (_, user) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            src={user.profilePhoto} 
            name={`${user.firstName} ${user.lastName}`} 
            size="sm" 
          />
          <div>
            <div className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'employeeId',
      label: 'Employee ID',
      sortable: true,
    },
    {
      key: 'phone',
      label: 'Phone',
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
    },
    {
      key: 'position',
      label: 'Position',
    },
    {
      key: 'role',
      label: 'Role',
      render: (_, user) => (
        <Badge variant="info" size="sm">
          {user.role?.name || 'No Role'}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, user) => (
        <Badge 
          variant={user.isActive ? 'success' : 'error'} 
          size="sm"
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (_, user) => (
        <div className="text-sm text-gray-500">
          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/users/${user._id}`}
            className="text-blue-600 hover:text-blue-900 transition-colors"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            to={`/users/${user._id}/edit`}
            className="text-green-600 hover:text-green-900 transition-colors"
            title="Edit User"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={() => handleToggleUserStatus(user)}
            className={`transition-colors ${
              user.isActive 
                ? 'text-orange-600 hover:text-orange-900' 
                : 'text-green-600 hover:text-green-900'
            }`}
            title={user.isActive ? 'Deactivate User' : 'Activate User'}
          >
            {user.isActive ? (
              <UserMinusIcon className="h-4 w-4" />
            ) : (
              <UserPlusIcon className="h-4 w-4" />
            )}
          </button>
          {currentUser?._id !== user._id && (
            <button
              onClick={() => {
                setUserToDelete(user);
                setDeleteModalOpen(true);
              }}
              className="text-red-600 hover:text-red-900 transition-colors"
              title="Delete User"
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">
            Manage users, their roles, and permissions across your organization.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/users/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add User
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={handleSearch}
            />
          </div>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role._id} value={role._id}>{role.name}</option>
            ))}
          </select>

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

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          {loading ? (
            'Loading...'
          ) : (
            <>
              Showing {users.length} of {totalUsers} users
              {hasActiveFilters && ' (filtered)'}
            </>
          )}
        </p>
      </div>

      {/* Table */}
      <Table
        data={users}
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
          totalItems={totalUsers}
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
          setUserToDelete(null);
        }}
        title="Delete User"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-medium">
              {userToDelete?.firstName} {userToDelete?.lastName}
            </span>
            ? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Delete User
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;