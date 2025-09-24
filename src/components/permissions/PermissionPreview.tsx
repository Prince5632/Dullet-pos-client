import React from 'react';
import {
  ShieldCheckIcon,
  UserIcon,
  CogIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CubeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { Permission } from '../../types';
import Badge from '../ui/Badge';

interface PermissionPreviewProps {
  permissions: Permission[];
  compact?: boolean;
}

const PermissionPreview: React.FC<PermissionPreviewProps> = ({
  permissions,
  compact = false,
}) => {
  const getModuleIcon = (module: string) => {
    const icons: Record<string, React.ElementType> = {
      users: UserIcon,
      roles: ShieldCheckIcon,
      orders: DocumentTextIcon,
      billing: CurrencyDollarIcon,
      stock: CubeIcon,
      production: CogIcon,
      godowns: BuildingOfficeIcon,
      customers: UsersIcon,
      employees: UsersIcon,
      reports: ChartBarIcon,
      settings: CogIcon,
    };
    return icons[module] || ShieldCheckIcon;
  };

  const getModuleDisplayName = (module: string) => {
    const names: Record<string, string> = {
      users: 'Users',
      roles: 'Roles',
      orders: 'Orders',
      billing: 'Billing',
      stock: 'Stock',
      production: 'Production',
      godowns: 'Warehouse',
      customers: 'Customers',
      employees: 'Employees',
      reports: 'Reports',
      settings: 'Settings'
    };
    return names[module] || module.charAt(0).toUpperCase() + module.slice(1);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (permissions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <ShieldCheckIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm">No permissions assigned</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
          const Icon = getModuleIcon(module);
          return (
            <div key={module} className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-md">
              <Icon className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">
                {getModuleDisplayName(module)}
              </span>
              <Badge variant="info" size="sm">
                {modulePermissions.length}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
        const Icon = getModuleIcon(module);
        return (
          <div key={module} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Icon className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">
                {getModuleDisplayName(module)}
              </span>
              <Badge variant="info" size="sm">
                {modulePermissions.length} permissions
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {modulePermissions.map((permission) => (
                <div key={permission._id} className="text-sm text-gray-600">
                  • {permission.action.charAt(0).toUpperCase() + permission.action.slice(1)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionPreview;

