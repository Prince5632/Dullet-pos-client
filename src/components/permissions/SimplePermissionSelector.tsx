import React, { useState } from 'react';
import {
  CheckIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { Permission } from '../../types';
import { cn } from '../../utils';
import Badge from '../ui/Badge';

interface SimplePermissionSelectorProps {
  availablePermissions: Record<string, Permission[]>;
  selectedPermissions: string[];
  onChange: (permissionIds: string[]) => void;
  disabled?: boolean;
  readOnly?: boolean; // Allow accordion but disable selection
}

const SimplePermissionSelector: React.FC<SimplePermissionSelectorProps> = ({
  availablePermissions,
  selectedPermissions,
  onChange,
  disabled = false,
  readOnly = false,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // In read-only mode, expand modules that have selected permissions
    if (readOnly) {
      const modulesWithSelections = new Set<string>();
      Object.entries(availablePermissions).forEach(([module, permissions]) => {
        if (permissions.some(p => selectedPermissions.includes(p._id))) {
          modulesWithSelections.add(module);
        }
      });
      return modulesWithSelections.size > 0 ? modulesWithSelections : new Set(['users', 'roles']);
    }
    return new Set(['users', 'roles']);
  });

  const toggleModule = (module: string) => {
    // Allow accordion toggle even in readOnly mode, but not if fully disabled
    if (disabled && !readOnly) return;
    
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (disabled || readOnly) return;

    const newSelected = [...selectedPermissions];
    const index = newSelected.indexOf(permissionId);
    
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(permissionId);
    }
    
    onChange(newSelected);
  };

  const handleModuleToggle = (module: string, permissions: Permission[]) => {
    if (disabled || readOnly) return;

    const modulePermissionIds = permissions.map(p => p._id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
    
    let newSelected = [...selectedPermissions];
    
    if (allSelected) {
      // Remove all module permissions
      newSelected = newSelected.filter(id => !modulePermissionIds.includes(id));
    } else {
      // Add all module permissions
      modulePermissionIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
    }
    
    onChange(newSelected);
  };

  const getModuleDisplayName = (moduleKey: string) => {
    const names: Record<string, string> = {
      users: 'User Management',
      roles: 'Role Management',
      orders: 'Order Management',
      billing: 'Billing & Invoicing',
      stock: 'Stock Management',
      production: 'Production',
      godowns: 'Warehouse Management',
      customers: 'Customer Management',
      employees: 'Employee Management',
      reports: 'Reports & Analytics',
      settings: 'System Settings'
    };
    return names[moduleKey] || moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
  };

  const getActionDisplayName = (action: string) => {
    const names: Record<string, string> = {
      create: 'Create',
      read: 'View',
      update: 'Edit',
      delete: 'Delete',
      approve: 'Approve',
      manage: 'Full Access'
    };
    return names[action] || action.charAt(0).toUpperCase() + action.slice(1);
  };

  if (Object.keys(availablePermissions).length === 0) {
    return (
      <div className="text-center py-8">
        <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions available</h3>
        <p className="mt-1 text-sm text-gray-500">
          No permissions are available to assign.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(availablePermissions).map(([module, permissions]) => {
        const modulePermissionIds = permissions.map(p => p._id);
        const selectedCount = modulePermissionIds.filter(id => selectedPermissions.includes(id)).length;
        const totalCount = permissions.length;
        const allSelected = selectedCount === totalCount;
        const someSelected = selectedCount > 0 && selectedCount < totalCount;
        const isExpanded = expandedModules.has(module);

        return (
          <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Module Header */}
            <div 
              className={cn(
                "px-4 py-3 bg-gray-50 border-b border-gray-200",
                !(disabled && !readOnly) && "hover:bg-gray-100 transition-colors"
              )}
            >
              <div className="flex items-center justify-between">
                <div 
                  className={cn(
                    "flex items-center space-x-3 flex-1",
                    !(disabled && !readOnly) && "cursor-pointer"
                  )}
                  onClick={() => toggleModule(module)}
                >
                  <button
                    type="button"
                    className={cn(
                      "text-gray-400 hover:text-gray-600 p-1 rounded transition-colors",
                      !(disabled && !readOnly) && "cursor-pointer"
                    )}
                    disabled={disabled && !readOnly}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>
                
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleModuleToggle(module, permissions);
                      }}
                      disabled={disabled || readOnly}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <h3 className="text-base font-medium text-gray-900">
                      {getModuleDisplayName(module)}
                    </h3>
                  </div>
                </div>
                
                <Badge variant={selectedCount > 0 ? 'success' : 'default'} size="sm">
                  {selectedCount}/{totalCount}
                </Badge>
              </div>
            </div>

            {/* Module Permissions */}
            {isExpanded && (
              <div className="p-4 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {permissions.map((permission) => {
                    const isSelected = selectedPermissions.includes(permission._id);
                    
                    return (
                      <label
                        key={permission._id}
                        className={cn(
                          'flex items-center space-x-2 p-2 rounded-md border transition-colors',
                          isSelected
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-white border-gray-200',
                          !(disabled || readOnly) && 'cursor-pointer hover:bg-gray-50',
                          (disabled || readOnly) && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(permission._id)}
                          disabled={disabled || readOnly}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {getActionDisplayName(permission.action)}
                          </div>
                          {permission.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {permission.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-900">
            <span className="font-medium">
              {selectedPermissions.length} permissions selected
            </span>
            <span className="text-blue-700 ml-2">
              across {Object.values(availablePermissions).filter(permissions => 
                permissions.some(p => selectedPermissions.includes(p._id))
              ).length} modules
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePermissionSelector;
