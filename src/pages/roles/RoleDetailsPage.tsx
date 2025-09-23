import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CalendarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { roleService } from '../../services/roleService';
import type { Role, Permission } from '../../types';
import { formatDateTime, formatDate } from '../../utils';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SimplePermissionSelector from '../../components/permissions/SimplePermissionSelector';
import toast from 'react-hot-toast';

const RoleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [roleUsage, setRoleUsage] = useState<{ userCount: number; isDefault: boolean } | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, Permission[]>>({});

  // Load role data
  useEffect(() => {
    const loadRole = async () => {
      if (!id) {
        navigate('/roles');
        return;
      }

      try {
        setLoading(true);
        
        // Load role and available permissions in parallel
        const [roleData, permissionsData] = await Promise.all([
          roleService.getRoleById(id),
          roleService.getAvailablePermissions().catch(() => ({})),
        ]);
        
        // Set default usage data for now (until backend implements this endpoint)
        const usageData = { userCount: 0, isDefault: roleData.isDefault || false };

        setRole(roleData);
        setRoleUsage(usageData);
        setAvailablePermissions(permissionsData);
      } catch (error) {
        console.error('Failed to load role:', error);
        toast.error('Failed to load role details');
        navigate('/roles');
      } finally {
        setLoading(false);
      }
    };

    loadRole();
  }, [id, navigate]);

  // Handle role actions
  const handleToggleRoleStatus = async () => {
    if (!role) return;

    try {
      setActionLoading(true);
      if (role.isActive) {
        await roleService.deleteRole(role._id);
        toast.success('Role deactivated successfully');
      } else {
        await roleService.activateRole(role._id);
        toast.success('Role activated successfully');
      }
      
      // Reload role data
      const updatedRole = await roleService.getRoleById(role._id);
      setRole(updatedRole);
    } catch (error) {
      console.error('Failed to update role status:', error);
      toast.error('Failed to update role status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!role) return;

    try {
      setActionLoading(true);
      await roleService.deleteRole(role._id);
      toast.success('Role deleted successfully');
      navigate('/roles');
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    } finally {
      setActionLoading(false);
    }
  };

  const getPermissionsByModule = () => {
    if (!role?.permissions || !availablePermissions) return {};
    
    const result: Record<string, Permission[]> = {};
    
    Object.entries(availablePermissions).forEach(([module, modulePermissions]) => {
      const rolePermissions = modulePermissions.filter(p => 
        role.permissions.some(rp => rp._id === p._id)
      );
      if (rolePermissions.length > 0) {
        result[module] = rolePermissions;
      }
    });
    
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading role details...</span>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Role not found</p>
      </div>
    );
  }

  const selectedPermissionIds = role.permissions?.map(p => p._id) || [];
  const permissionsByModule = getPermissionsByModule();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/roles')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Roles
          </button>
          <div className="h-6 border-l border-gray-300"></div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{role.name}</h1>
              {role.isDefault && (
                <Badge variant="success" size="lg">Default Role</Badge>
              )}
              <Badge variant={role.isActive ? 'success' : 'error'} size="lg">
                {role.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-gray-600">{role.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!role.isDefault && (
            <button
              onClick={handleToggleRoleStatus}
              disabled={actionLoading}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors ${
                role.isActive
                  ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                  : 'text-green-700 bg-green-100 hover:bg-green-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {role.isActive ? (
                <XCircleIcon className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 mr-2" />
              )}
              {role.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}

          <Link
            to={`/roles/${role._id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Role
          </Link>

          {!role.isDefault && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Role Overview</h3>
            </div>

            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Role Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{role.name}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{role.description}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant={role.isActive ? 'success' : 'error'}>
                    {role.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1">
                  <Badge variant={role.isDefault ? 'success' : 'info'}>
                    {role.isDefault ? 'Default Role' : 'Custom Role'}
                  </Badge>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Total Permissions</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {role.permissions?.length || 0} permissions
                </dd>
              </div>

              {roleUsage && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Users with this role</dt>
                  <dd className="mt-1 flex items-center space-x-2">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{roleUsage.userCount} users</span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 flex items-center space-x-2 text-sm text-gray-900">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(role.createdAt)}</span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 flex items-center space-x-2 text-sm text-gray-900">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(role.updatedAt)}</span>
                </dd>
              </div>
            </div>

            {role.isDefault && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Default Role</p>
                    <p className="mt-1">
                      This is a system default role. Some actions may be restricted.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
                <p className="text-sm text-gray-500">
                  Permissions assigned to this role
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {role.permissions?.length || 0} permissions
                </div>
                <div className="text-xs text-gray-500">
                  across {Object.keys(permissionsByModule).length} modules
                </div>
              </div>
            </div>

            {role.permissions && role.permissions.length > 0 ? (
              <SimplePermissionSelector
                availablePermissions={permissionsByModule}
                selectedPermissions={selectedPermissionIds}
                onChange={() => {}} // Read-only
                readOnly={true}
              />
            ) : (
              <div className="text-center py-8">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This role doesn't have any permissions assigned yet.
                </p>
                <div className="mt-6">
                  <Link
                    to={`/roles/${role._id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Role"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the role{' '}
            <span className="font-medium">{role.name}</span>?
          </p>

          {roleUsage && roleUsage.userCount > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Warning</p>
                  <p className="mt-1">
                    This role is currently assigned to {roleUsage.userCount} user(s). 
                    Deleting it will remove the role from all assigned users.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? 'Deleting...' : 'Delete Role'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RoleDetailsPage;