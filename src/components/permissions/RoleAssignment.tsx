import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { roleService } from '../../services/roleService';
import type { Role } from '../../types';
import { cn } from '../../utils';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';

interface RoleAssignmentProps {
  selectedRoleId?: string;
  onRoleChange: (roleId: string | null, role: Role | null) => void;
  disabled?: boolean;
  showPermissions?: boolean;
  label?: string;
  placeholder?: string;
  error?: string;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({
  selectedRoleId,
  onRoleChange,
  disabled = false,
  showPermissions = true,
  label = 'Role',
  placeholder = 'Select a role',
  error,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        const allRoles = await roleService.getAllRoles();
        setRoles(allRoles.filter(role => role.isActive));
      } catch (error) {
        console.error('Failed to load roles:', error);
        toast.error('Failed to load roles');
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, []);

  // Update selected role when selectedRoleId changes
  useEffect(() => {
    if (selectedRoleId && roles.length > 0) {
      const role = roles.find(r => r._id === selectedRoleId);
      setSelectedRole(role || null);
    } else {
      setSelectedRole(null);
    }
  }, [selectedRoleId, roles]);

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    onRoleChange(role._id, role);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedRole(null);
    onRoleChange(null, null);
    setSearchTerm('');
  };

  const getRoleBadgeVariant = (role: Role) => {
    if (role.isDefault) return 'success';
    return 'info';
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {selectedRole && !disabled && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="ml-2 text-sm text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          )}
        </label>
      )}

      <div className="relative">
        <div
          className={cn(
            'relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left shadow-sm transition-colors',
            error
              ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
              : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500',
            disabled && 'bg-gray-50 cursor-not-allowed',
            !disabled && 'focus-within:ring-1'
          )}
        >
          {selectedRole ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRole.name}
                    </span>
                    <Badge variant={getRoleBadgeVariant(selectedRole)} size="sm">
                      {selectedRole.isDefault ? 'Default' : 'Custom'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedRole.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">{placeholder}</span>
            </div>
          )}

          {!disabled && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {/* Search */}
            <div className="sticky top-0 bg-white px-3 py-2 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="px-3 py-8 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-500">Loading roles...</span>
                </div>
              </div>
            )}

            {/* No results */}
            {!loading && filteredRoles.length === 0 && (
              <div className="px-3 py-8 text-center">
                <UserGroupIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  {searchTerm ? 'No roles match your search' : 'No roles available'}
                </p>
              </div>
            )}

            {/* Role options */}
            {!loading && filteredRoles.map((role) => (
              <button
                key={role._id}
                type="button"
                className={cn(
                  'relative w-full text-left px-3 py-3 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors',
                  selectedRole?._id === role._id && 'bg-blue-50'
                )}
                onClick={() => handleRoleSelect(role)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {role.name}
                        </span>
                        <Badge variant={getRoleBadgeVariant(role)} size="sm">
                          {role.isDefault ? 'Default' : 'Custom'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {role.description}
                      </p>
                      {showPermissions && role.permissions && role.permissions.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">
                            {role.permissions.length} permissions assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRole?._id === role._id && (
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role Details */}
      {selectedRole && showPermissions && selectedRole.permissions && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Selected Role: {selectedRole.name}
          </h4>
          <p className="text-sm text-gray-600 mb-2">{selectedRole.description}</p>
          <div className="text-sm text-gray-500">
            <span className="font-medium">{selectedRole.permissions.length}</span> permissions assigned
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default RoleAssignment;
