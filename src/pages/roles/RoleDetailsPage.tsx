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
  EllipsisVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
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
  const [showActions, setShowActions] = useState(false);
  const [showPermissions, setShowPermissions] = useState(true); // Changed to true (open by default)

  // Load role data
  useEffect(() => {
    const loadRole = async () => {
      if (!id) {
        navigate('/roles');
        return;
      }

      try {
        setLoading(true);
        
        const [roleData, permissionsData] = await Promise.all([
          roleService.getRoleById(id),
          roleService.getAvailablePermissions().catch(() => ({})),
        ]);
        
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Role not found</p>
          <button
            onClick={() => navigate('/roles')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Roles
          </button>
        </div>
      </div>
    );
  }

  const selectedPermissionIds = role.permissions?.map(p => p._id) || [];
  const permissionsByModule = getPermissionsByModule();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/roles')}
                className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{role.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {role.isDefault && (
                      <Badge variant="success" size="sm">Default</Badge>
                    )}
                    <Badge variant={role.isActive ? 'success' : 'error'} size="sm">
                      {role.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to={`/roles/${role._id}/edit`}
                  className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Link>
                
                {!role.isDefault && (
                  <>
                    <button
                      onClick={handleToggleRoleStatus}
                      disabled={actionLoading}
                      className={`inline-flex items-center px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                        role.isActive
                          ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {role.isActive ? (
                        <XCircleIcon className="h-4 w-4 mr-2" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      {role.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="inline-flex items-center px-3 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </>
                )}
              </div>

              {/* Mobile Actions Menu */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
                
                {showActions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <Link
                        to={`/roles/${role._id}/edit`}
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                        onClick={() => setShowActions(false)}
                      >
                        <PencilIcon className="h-4 w-4 mr-3" />
                        Edit Role
                      </Link>
                      
                      {!role.isDefault && (
                        <>
                          <button
                            onClick={() => {
                              handleToggleRoleStatus();
                              setShowActions(false);
                            }}
                            disabled={actionLoading}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {role.isActive ? (
                              <XCircleIcon className="h-4 w-4 mr-3" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4 mr-3" />
                            )}
                            {role.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          
                          <button
                            onClick={() => {
                              setDeleteModalOpen(true);
                              setShowActions(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                          >
                            <TrashIcon className="h-4 w-4 mr-3" />
                            Delete Role
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-4">
        {/* Role Overview Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Role Details</h3>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <dt className="text-xs font-medium text-gray-500 mb-2">Description</dt>
              <dd className="text-sm text-gray-900 leading-relaxed">{role.description}</dd>
            </div>

            {/* Stats Grid - Perfect Alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Permissions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {role.permissions?.length || 0}
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Users</div>
                <div className="text-lg font-semibold text-gray-900">
                  {roleUsage?.userCount || 0}
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Type</div>
                <div className="text-lg font-semibold text-gray-900">
                  {role.isDefault ? 'Default' : 'Custom'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Modules</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Object.keys(permissionsByModule).length}
                </div>
              </div>
            </div>

            {/* Metadata - Perfect Alignment */}
            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm text-gray-900">{formatDate(role.createdAt)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Updated</div>
                    <div className="text-sm text-gray-900">{formatDate(role.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for Default Role - Perfect Alignment */}
          {role.isDefault && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">System Default Role</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Some actions may be restricted for this role
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permissions Card - Open by Default */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">Permissions</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {role.permissions?.length || 0} permissions
                </div>
                <div className="text-xs text-gray-500">
                  across {Object.keys(permissionsByModule).length} modules
                </div>
              </div>
              
              <button
                onClick={() => setShowPermissions(!showPermissions)}
                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {showPermissions ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Permissions List - Open by Default */}
          <div className={`lg:block ${showPermissions ? 'block' : 'hidden'}`}>
            {role.permissions && role.permissions.length > 0 ? (
              <SimplePermissionSelector
                availablePermissions={permissionsByModule}
                selectedPermissions={selectedPermissionIds}
                onChange={() => {}} // Read-only
                readOnly={true}
              />
            ) : (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3">
                  <ShieldCheckIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">No permissions assigned</h4>
                <p className="text-xs text-gray-500 mb-4">
                  This role doesn't have any permissions yet
                </p>
                <Link
                  to={`/roles/${role._id}/edit`}
                  className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Add Permissions
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Summary when collapsed */}
          <div className={`lg:hidden ${showPermissions ? 'hidden' : 'block'}`}>
            {Object.keys(permissionsByModule).length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  {role.permissions?.length || 0} permissions across {Object.keys(permissionsByModule).length} modules
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.entries(permissionsByModule).slice(0, 4).map(([module, permissions]) => (
                    <Badge key={module} variant="default" size="sm">
                      {module}: {permissions.length}
                    </Badge>
                  ))}
                  {Object.keys(permissionsByModule).length > 4 && (
                    <Badge variant="default" size="sm">
                      +{Object.keys(permissionsByModule).length - 4} more
                    </Badge>
                  )}
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
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Warning</p>
                  <p className="text-xs text-red-700 mt-1">
                    This role is assigned to {roleUsage.userCount} user(s). 
                    Deleting will remove the role from all users.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">This action cannot be undone.</p>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRole}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
