import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { roleService } from '../../services/roleService';
import type { CreateRoleForm, Permission } from '../../types';
import { cn } from '../../utils';
import SimplePermissionSelector from '../../components/permissions/SimplePermissionSelector';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

// Validation schema
const createRoleSchema = yup.object({
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

const CreateRolePage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, Permission[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CreateRoleForm>({
    resolver: yupResolver(createRoleSchema) as any,
    mode: 'onBlur',
  });

  const watchedName = watch('name', '');

  // Load available permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setPermissionsLoading(true);
        const permissions = await roleService.getAvailablePermissions();
        setAvailablePermissions(permissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
        toast.error('Failed to load permissions');
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, []);

  // Handle form submission
  const onSubmit = async (data: CreateRoleForm) => {
    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setLoading(true);

      const roleData: CreateRoleForm = {
        name: data.name.trim(),
        description: data.description.trim(),
        permissions: selectedPermissions,
      };

      const newRole = await roleService.createRole(roleData);
      toast.success('Role created successfully');
      navigate(`/roles/${newRole._id}`);
    } catch (error: any) {
      console.error('Failed to create role:', error);
      toast.error(error.message || 'Failed to create role');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Role</h1>
          <p className="text-gray-600">Define a new role with specific permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Details */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center space-x-2 mb-4">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Role Details</h3>
              </div>

              <div className="space-y-4">
                {/* Role Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                      errors.name 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    )}
                    placeholder="Enter role name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                      errors.description 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    )}
                    placeholder="Describe the role and its purpose"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                {/* Preview */}
                {watchedName && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="info" size="lg">{watchedName}</Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {selectedPermissions.length} of {getTotalPermissions()} permissions selected
                    </p>
                    
                    {Object.keys(getSelectedPermissionsByModule()).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Selected by module:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(getSelectedPermissionsByModule()).map(([module, count]) => (
                            <Badge key={module} variant="default" size="xs">
                              {module}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Role Creation Tips</p>
                    <ul className="text-xs space-y-1">
                      <li>• Choose a descriptive name</li>
                      <li>• Select only necessary permissions</li>
                      <li>• You can modify permissions later</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
                  <p className="text-sm text-gray-500">
                    Select the permissions this role should have
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedPermissions.length} / {getTotalPermissions()}
                  </div>
                  <div className="text-xs text-gray-500">permissions selected</div>
                </div>
              </div>

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading permissions...</span>
                </div>
              ) : (
                <SimplePermissionSelector
                  availablePermissions={availablePermissions}
                  selectedPermissions={selectedPermissions}
                  onChange={handlePermissionChange}
                />
              )}

              {selectedPermissions.length === 0 && !permissionsLoading && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Please select at least one permission to create the role.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/roles')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitting || selectedPermissions.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading || isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Role...
              </>
            ) : (
              'Create Role'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRolePage;
