import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { roleService, type UpdateRoleForm } from '../../services/roleService';
import type { Role, Permission } from '../../types';
import { cn } from '../../utils';
import SimplePermissionSelector from '../../components/permissions/SimplePermissionSelector';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

// Validation schema
const editRoleSchema = yup.object({
  name: yup
    .string()
    .required('Role name is required')
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must be less than 200 characters'),
});

const EditRolePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, Permission[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [roleUsage, setRoleUsage] = useState<{ userCount: number; isDefault: boolean } | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    resolver: yupResolver(editRoleSchema),
    mode: 'onBlur',
  });

  const watchedName = watch('name', '');
  const watchedDescription = watch('description', '');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/roles');
        return;
      }

      try {
        setLoading(true);
        
        const [roleData, permissionsData] = await Promise.all([
          roleService.getRoleById(id),
          roleService.getAvailablePermissions(),
        ]);
        
        const usageData = { userCount: 0, isDefault: roleData.isDefault || false };

        setRole(roleData);
        setAvailablePermissions(permissionsData);
        setRoleUsage(usageData);
        setSelectedPermissions(roleData.permissions?.map(p => p._id) || []);

        reset({
          name: roleData.name,
          description: roleData.description,
        });
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load role data');
        navigate('/roles');
      } finally {
        setLoading(false);
        setPermissionsLoading(false);
      }
    };

    loadData();
  }, [id, navigate, reset]);

  // Handle form submission
  const onSubmit = async (data: any) => {
    if (!role) return;

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setSaving(true);

      const updateData: UpdateRoleForm = {
        name: data.name?.trim(),
        description: data.description?.trim(),
        permissions: selectedPermissions,
      };

      await roleService.updateRole(role._id, updateData);
      toast.success('Role updated successfully');
      navigate(`/roles/${role._id}`);
    } catch (error: any) {
      console.error('Failed to update role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (permissionIds: string[]) => {
    setSelectedPermissions(permissionIds);
  };

  const getTotalPermissions = () => {
    return Object.values(availablePermissions).reduce((total, permissions) => total + permissions.length, 0);
  };

  const getSelectedPermissionsByModule = () => {
    const result: Record<string, number> = {};
    Object.entries(availablePermissions).forEach(([module, permissions]) => {
      const selectedCount = permissions.filter(p => selectedPermissions.includes(p._id)).length;
      if (selectedCount > 0) {
        result[module] = selectedCount;
      }
    });
    return result;
  };

  const hasChanges = () => {
    if (!role) return false;
    
    const originalPermissions = role.permissions?.map(p => p._id).sort() || [];
    const currentPermissions = [...selectedPermissions].sort();
    
    return (
      watchedName !== role.name ||
      watchedDescription !== role.description ||
      JSON.stringify(originalPermissions) !== JSON.stringify(currentPermissions)
    );
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/roles/${role._id}`)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Edit Role</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Modify permissions & details</p>
                </div>
              </div>
              {role.isDefault && (
                <Badge variant="success" size="sm">Default</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/roles/${role._id}`)}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving || isSubmitting || selectedPermissions.length === 0 || !hasChanges()}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving || isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Warnings */}
        {role.isDefault && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">System Default Role</p>
                <p className="text-xs mt-0.5">Changes affect all users with this role</p>
              </div>
            </div>
          </div>
        )}

        {roleUsage && roleUsage.userCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Active Role</p>
                <p className="text-xs mt-0.5">Assigned to {roleUsage.userCount} user(s)</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Role Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <ShieldCheckIcon className="h-4 w-4 mr-1.5" />
              Role Details
            </h3>

            <div className="space-y-3">
              {/* Role Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  className={cn(
                    'block w-full px-2.5 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    errors.name 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter role name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={3}
                  {...register('description')}
                  className={cn(
                    'block w-full px-2.5 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    errors.description 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Describe the role and its purpose"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Preview */}
              {watchedName && (
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-700 mb-2">Preview</div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant="info" size="sm">{watchedName}</Badge>
                    {role.isDefault && (
                      <Badge variant="success" size="sm">Default</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {selectedPermissions.length} of {getTotalPermissions()} permissions
                  </div>
                  
                  {Object.keys(getSelectedPermissionsByModule()).length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-1">By module:</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(getSelectedPermissionsByModule()).map(([module, count]) => (
                          <Badge key={module} variant="default" size="sm">
                            {module}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasChanges() && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-xs text-orange-800 font-medium">
                        ⚠️ Unsaved changes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Permissions Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Permissions</h3>
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-blue-600 hover:bg-blue-50 transition-colors lg:hidden"
              >
                {showPermissions ? 'Hide' : 'Show'} Permissions
              </button>
              <div className="hidden lg:block text-right">
                <div className="text-sm font-medium text-gray-900">
                  {selectedPermissions.length} / {getTotalPermissions()}
                </div>
                <div className="text-xs text-gray-500">selected</div>
              </div>
            </div>

            {/* Mobile: Collapsible Permissions */}
            <div className={`lg:block ${showPermissions ? 'block' : 'hidden'}`}>
              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Loading permissions...</span>
                  </div>
                </div>
              ) : (
                <SimplePermissionSelector
                  availablePermissions={availablePermissions}
                  selectedPermissions={selectedPermissions}
                  onChange={handlePermissionChange}
                />
              )}

              {selectedPermissions.length === 0 && !permissionsLoading && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      Please select at least one permission
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: Summary when collapsed */}
            <div className={`lg:hidden ${showPermissions ? 'hidden' : 'block'}`}>
              <div className="text-sm text-gray-600">
                {selectedPermissions.length} of {getTotalPermissions()} permissions selected
              </div>
              {Object.keys(getSelectedPermissionsByModule()).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(getSelectedPermissionsByModule()).slice(0, 3).map(([module, count]) => (
                    <Badge key={module} variant="default" size="sm">
                      {module}: {count}
                    </Badge>
                  ))}
                  {Object.keys(getSelectedPermissionsByModule()).length > 3 && (
                    <Badge variant="default" size="sm">
                      +{Object.keys(getSelectedPermissionsByModule()).length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Editing Tips</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  <li>Changes take effect immediately</li>
                  <li>Affected users see updates instantly</li>
                  <li>Save to apply all changes</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom">
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/roles/${role._id}`)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving || isSubmitting || selectedPermissions.length === 0 || !hasChanges()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving || isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Padding */}
      <div className="h-20 lg:hidden"></div>
    </div>
  );
};

export default EditRolePage;
