import React, { useState, useEffect } from 'react';
import {
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import type { Permission } from '../../types';
import { cn } from '../../utils';
import Badge from '../ui/Badge';

interface PermissionMatrixProps {
  availablePermissions: Record<string, Permission[]>;
  selectedPermissions: string[];
  onChange: (permissionIds: string[]) => void;
  disabled?: boolean;
  showModuleHeaders?: boolean;
  compact?: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  availablePermissions,
  selectedPermissions,
  onChange,
  disabled = false,
  showModuleHeaders = true,
  compact = false,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Initialize with all modules expanded
  useEffect(() => {
    if (!compact) {
      setExpandedModules(new Set(Object.keys(availablePermissions)));
    }
  }, [availablePermissions, compact]);

  const toggleModule = (module: string) => {
    if (disabled) return;
    
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (disabled) return;

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
    if (disabled) return;

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <PlusIcon className="h-4 w-4" />;
      case 'read':
        return <EyeIcon className="h-4 w-4" />;
      case 'update':
        return <PencilIcon className="h-4 w-4" />;
      case 'delete':
        return <TrashIcon className="h-4 w-4" />;
      case 'approve':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'manage':
        return <CogIcon className="h-4 w-4" />;
      default:
        return <ShieldCheckIcon className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600';
      case 'read':
        return 'text-blue-600';
      case 'update':
        return 'text-yellow-600';
      case 'delete':
        return 'text-red-600';
      case 'approve':
        return 'text-purple-600';
      case 'manage':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
    }
  };

  const getModuleDisplayName = (module: string) => {
    return module.charAt(0).toUpperCase() + module.slice(1);
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
    <div className="space-y-4">
      {Object.entries(availablePermissions).map(([module, permissions]) => {
        const modulePermissionIds = permissions.map(p => p._id);
        const selectedCount = modulePermissionIds.filter(id => selectedPermissions.includes(id)).length;
        const totalCount = permissions.length;
        const allSelected = selectedCount === totalCount;
        const someSelected = selectedCount > 0 && selectedCount < totalCount;
        const isExpanded = expandedModules.has(module);

        return (
          <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
            {showModuleHeaders && (
              <div 
                className={cn(
                  'px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between',
                  !disabled && 'cursor-pointer hover:bg-gray-100'
                )}
                onClick={() => toggleModule(module)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={() => handleModuleToggle(module, permissions)}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {getModuleDisplayName(module)}
                  </h3>
                  <Badge variant="default" size="sm">
                    {selectedCount}/{totalCount}
                  </Badge>
                </div>
                
                {compact && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleModule(module);
                    }}
                  >
                    {isExpanded ? (
                      <XMarkIcon className="h-5 w-5" />
                    ) : (
                      <PlusIcon className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
            )}

            {(!compact || isExpanded) && (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {permissions.map((permission) => {
                    const isSelected = selectedPermissions.includes(permission._id);
                    
                    return (
                      <div
                        key={permission._id}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50',
                          !disabled && 'cursor-pointer'
                        )}
                        onClick={() => handlePermissionToggle(permission._id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(permission._id)}
                          disabled={disabled}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={cn('flex-shrink-0', getActionColor(permission.action))}>
                              {getActionIcon(permission.action)}
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {permission.action.charAt(0).toUpperCase() + permission.action.slice(1)}
                            </span>
                          </div>
                          {permission.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {permission.description}
                            </p>
                          )}
                        </div>

                        {isSelected && (
                          <CheckIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
