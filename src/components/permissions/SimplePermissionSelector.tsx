import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Permission } from '../../types';

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

    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];
    
    onChange(newSelected);
  };

  const handleModuleToggle = (moduleKey: string) => {
    if (disabled || readOnly) return;

    const modulePermissions = availablePermissions[moduleKey] || [];
    const modulePermissionIds = modulePermissions.map(p => p._id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.includes(id));
    
    let newSelected: string[];
    if (allSelected) {
      // Deselect all permissions in this module
      newSelected = selectedPermissions.filter(id => !modulePermissionIds.includes(id));
    } else {
      // Select all permissions in this module
      const otherSelected = selectedPermissions.filter(id => !modulePermissionIds.includes(id));
      newSelected = [...otherSelected, ...modulePermissionIds];
    }
    
    onChange(newSelected);
  };

  const getModuleStats = (moduleKey: string) => {
    const modulePermissions = availablePermissions[moduleKey] || [];
    const selectedCount = modulePermissions.filter(p => selectedPermissions.includes(p._id)).length;
    const totalCount = modulePermissions.length;
    return { selectedCount, totalCount };
  };

  const formatModuleName = (moduleKey: string) => {
    return moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace(/([A-Z])/g, ' $1');
  };

  if (Object.keys(availablePermissions).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No permissions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(availablePermissions).map(([moduleKey, permissions]) => {
        const isExpanded = expandedModules.has(moduleKey);
        const { selectedCount, totalCount } = getModuleStats(moduleKey);
        const allSelected = selectedCount === totalCount && totalCount > 0;
        const someSelected = selectedCount > 0 && selectedCount < totalCount;

        return (
          <div key={moduleKey} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Module Header */}
            <div
              className={`px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${
                disabled && !readOnly ? 'cursor-not-allowed opacity-50' : ''
              }`}
              onClick={() => toggleModule(moduleKey)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                  )}
                  
                  {!readOnly && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleModuleToggle(moduleKey);
                      }}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                  
                  <h3 className="text-sm font-medium text-gray-900">
                    {formatModuleName(moduleKey)}
                  </h3>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {selectedCount}/{totalCount} selected
                  </span>
                  {selectedCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Module Permissions */}
            {isExpanded && (
              <div className="px-4 py-3 bg-white">
                {permissions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No permissions available in this module</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <label
                        key={permission._id}
                        className={`flex items-center space-x-3 p-2 rounded hover:bg-gray-50 transition-colors ${
                          disabled || readOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission._id)}
                          onChange={() => handlePermissionToggle(permission._id)}
                          disabled={disabled || readOnly}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {permission.name}
                          </div>
                          {permission.description && (
                            <div className="text-xs text-gray-500">
                              {permission.description}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {selectedPermissions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>{selectedPermissions.length}</strong> permission{selectedPermissions.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplePermissionSelector;
