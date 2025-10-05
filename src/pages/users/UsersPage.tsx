import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowUpTrayIcon,
  Squares2X2Icon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { roleService } from "../../services/roleService";
import type { User, Role, TableColumn } from "../../types";
import { formatDate, debounce } from "../../utils";
import { exportFilteredUsersToExcel } from "../../utils/excelExport";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import Modal from "../../components/ui/Modal";
import RoleAssignment from "../../components/permissions/RoleAssignment";
import toast from "react-hot-toast";

interface UserListFilters {
  search: string;
  department: string;
  role: string;
  status: string;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);
  const [selectedRoleForBulk, setSelectedRoleForBulk] = useState<Role | null>(
    null
  );

  // Filters
  const [filters, setFilters] = useState<UserListFilters>({
    search: "",
    department: "",
    role: "",
    status: "true", // Default to showing only active users
  });

  // Departments list
  const departments = userService.getDepartments();
  const statusOptions = userService.getStatusOptions();

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        setFilters((prev) => ({ ...prev, search: searchTerm }));
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
        
        console.log('📊 Users Pagination:', {
          totalPages: response.data.pagination?.totalPages,
          totalUsers: response.data.pagination?.totalUsers,
          currentPage: response.data.pagination?.currentPage,
          fullResponse: response
        });
        
        setTotalUsers(response.data.pagination?.totalUsers || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      if (error.name !== "CanceledError") {
        console.error("Failed to load users:", error);
        toast.error("Failed to load users");
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
      console.error("Failed to load roles:", error);
    }
  };

  // Effects
  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
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
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await userService.deleteUser(userToDelete._id);
      toast.success("User deleted successfully");
      setDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.isActive) {
        await userService.deactivateUser(user._id);
        toast.success("User deactivated successfully");
      } else {
        await userService.activateUser(user._id);
        toast.success("User activated successfully");
      }
      loadUsers();
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      department: "",
      role: "",
      status: "",
    });
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((user) => user._id)));
    }
  };

  // Bulk operations
  const handleBulkActivate = async () => {
    try {
      setBulkActionLoading(true);
      await userService.bulkActivateUsers(Array.from(selectedUsers));
      toast.success(`${selectedUsers.size} users activated successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      console.error("Failed to activate users:", error);
      toast.error("Failed to activate users");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      setBulkActionLoading(true);
      await userService.bulkDeactivateUsers(Array.from(selectedUsers));
      toast.success(`${selectedUsers.size} users deactivated successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      console.error("Failed to deactivate users:", error);
      toast.error("Failed to deactivate users");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);
      await userService.bulkDeleteUsers(Array.from(selectedUsers));
      toast.success(`${selectedUsers.size} users deleted successfully`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      console.error("Failed to delete users:", error);
      toast.error("Failed to delete users");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export/Import handlers
  const handleExportUsers = async () => {
    try {
      setExportLoading(true);
      
      // Get filtered users data
      const params = {
        page: 1,
        limit: 10000, // Get all users for export
        search: filters.search,
        department: filters.department,
        role: filters.role,
        isActive: filters.status,
      };

      const response = await userService.getUsers(params);
      
      if (response.success && response.data) {
        await exportFilteredUsersToExcel(response.data.users, filters);
        toast.success("Users exported successfully");
      } else {
        throw new Error("Failed to fetch users data");
      }
    } catch (error) {
      console.error("Failed to export users:", error);
      toast.error("Failed to export users");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please select a CSV file");
        return;
      }
      setImportFile(file);
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) return;

    try {
      setImportLoading(true);
      const result = await userService.importUsers(importFile);
      toast.success(
        `Import completed: ${result.success} users imported, ${result.failed} failed`
      );

      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
        toast.error(`${result.errors.length} errors occurred during import`);
      }

      setImportModalOpen(false);
      setImportFile(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to import users:", error);
      toast.error("Failed to import users");
    } finally {
      setImportLoading(false);
    }
  };

  // Bulk role assignment
  const handleBulkRoleAssignment = async () => {
    if (!selectedRoleForBulk || selectedUsers.size === 0) return;

    try {
      setBulkActionLoading(true);

      const updatePromises = Array.from(selectedUsers).map((userId) =>
        userService.updateUser(userId, { roleId: selectedRoleForBulk._id })
      );

      await Promise.all(updatePromises);

      toast.success(
        `Role "${selectedRoleForBulk.name}" assigned to ${selectedUsers.size} users successfully`
      );
      setBulkRoleModalOpen(false);
      setSelectedRoleForBulk(null);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      console.error("Failed to assign roles:", error);
      toast.error("Failed to assign roles to users");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Table columns
  const columns: TableColumn<User>[] = [
    {
      key: "select",
      label: "",
      render: (_, user) => (
        <input
          type="checkbox"
          checked={selectedUsers.has(user._id)}
          onChange={() => handleSelectUser(user._id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
    {
      key: "user",
      label: "User",
      render: (_, user) => (
        <div className="flex items-center space-x-2">
          <Avatar
            src={user.profilePhoto}
            name={`${user.firstName} ${user.lastName}`}
            size="sm"
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
            <div className="text-xs text-gray-500 truncate">{user.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "employeeId",
      label: "ID",
      sortable: true,
      render: (value) => <div className="text-xs text-gray-900">{value}</div>,
    },
    {
      key: "department",
      label: "Dept",
      sortable: true,
      render: (value) => (
        <div className="text-xs text-gray-900 truncate">{value}</div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (_, user) => (
        <Badge variant="info" size="sm">
          {user.role?.name || "No Role"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (_, user) => (
        <Badge variant={user.isActive ? "success" : "error"} size="sm">
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, user) => (
        <div className="flex items-center space-x-1">
          <Link
            to={`/users/${user._id}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="View"
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/users/${user._id}/edit`}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => handleToggleUserStatus(user)}
            className={`p-1.5 rounded-md transition-colors ${
              user.isActive
                ? "text-orange-600 hover:bg-orange-50"
                : "text-green-600 hover:bg-green-50"
            }`}
            title={user.isActive ? "Deactivate" : "Activate"}
          >
            {user.isActive ? (
              <UserMinusIcon className="h-3.5 w-3.5" />
            ) : (
              <UserPlusIcon className="h-3.5 w-3.5" />
            )}
          </button>
          {currentUser?._id !== user._id && (
            <button
              onClick={() => {
                setUserToDelete(user);
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

  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Users</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Manage team members
                </p>
              </div>
            </div>

            <Link
              to="/users/create"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={handleExportUsers}
            disabled={exportLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Export users to Excel file"
          >
            {exportLoading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600" />
            ) : (
              <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            )}
            Export Excel
          </button>

          {/* <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            Import
          </button>

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
          </button> */}
        </div>

        {/* Compact Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            {/* Search Bar */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                onChange={handleSearch}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange("search", "")}
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
                  showFilters
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-700"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <select
                    value={filters.department}
                    onChange={(e) =>
                      handleFilterChange("department", e.target.value)
                    }
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange("role", e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    {roles.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedUsers.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.size} selected
              </span>
              <button
                onClick={() => setSelectedUsers(new Set())}
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
                <UserPlusIcon className="h-3 w-3" />
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={bulkActionLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 transition-colors"
              >
                <UserMinusIcon className="h-3 w-3" />
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="h-3 w-3" />
                Delete
              </button>
              <button
                onClick={() => setBulkRoleModalOpen(true)}
                disabled={bulkActionLoading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 transition-colors"
              >
                <ShieldCheckIcon className="h-3 w-3" />
                Assign Role
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">
              {filters.status === "true" ? "Active Users" : filters.status === "false" ? "Inactive Users" : "Total Users"}
            </div>
            <div className="text-sm font-semibold">{totalUsers}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
            <div className="text-xs text-gray-500">On This Page</div>
            <div className="text-sm font-semibold text-blue-600">
              {users.length}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No Users Found
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Get started by adding your first user"}
              </p>
              {!hasActiveFilters && (
                <Link
                  to="/users/create"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add First User
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
                        checked={
                          selectedUsers.size === users.length &&
                          users.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-700">Select All</span>
                    </div>
                  </div>
                )}

                {users.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user._id)}
                            onChange={() => handleSelectUser(user._id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <Avatar
                          src={user.profilePhoto}
                          name={`${user.firstName} ${user.lastName}`}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {user.email}
                          </div> 
                              <div className="text-xs text-gray-500 truncate">
                            {user.phone}
                          </div>   
                          <div className="text-xs text-gray-400">
                            ID: {user.employeeId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Link
                          to={`/users/${user._id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/users/${user._id}/edit`}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">
                          {user.role?.name || "No Role"}
                        </Badge>
                        <Badge
                          variant={user.isActive ? "success" : "error"}
                          size="sm"
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.department}
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
                        checked={
                          selectedUsers.size === users.length &&
                          users.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Select All</span>
                    </div>
                  </div>
                )}
                <Table
                  data={users}
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
                totalItems={totalUsers}
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
          setUserToDelete(null);
        }}
        title="Delete User"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{" "}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors"
            >
              Delete User
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Users Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportFile(null);
        }}
        title="Import Users"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-gray-600 mb-4 text-sm">
              Upload a CSV file to import multiple users. Required columns:
            </p>
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <code className="text-xs text-gray-800 break-all">
                firstName, lastName, email, phone, password, roleId, department,
                position
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {importFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {importFile.name}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setImportModalOpen(false);
                setImportFile(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportUsers}
              disabled={!importFile || importLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                "Import Users"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Role Assignment Modal */}
      <Modal
        isOpen={bulkRoleModalOpen}
        onClose={() => {
          setBulkRoleModalOpen(false);
          setSelectedRoleForBulk(null);
        }}
        title="Assign Role to Users"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-gray-600 mb-4 text-sm">
              Assign a role to {selectedUsers.size} selected user
              {selectedUsers.size !== 1 ? "s" : ""}. This will replace their
              current roles.
            </p>

            <RoleAssignment
              selectedRoleId={selectedRoleForBulk?._id}
              onRoleChange={(_, role) => setSelectedRoleForBulk(role)}
              label="Select Role"
              placeholder="Choose a role to assign"
              showPermissions={true}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setBulkRoleModalOpen(false);
                setSelectedRoleForBulk(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkRoleAssignment}
              disabled={!selectedRoleForBulk || bulkActionLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkActionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assigning...
                </>
              ) : (
                "Assign Role"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
