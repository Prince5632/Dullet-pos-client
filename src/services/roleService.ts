import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { Role, Permission, PaginationResponse, CreateRoleForm } from '../types';

export interface RoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | string;
}

export interface UpdateRoleForm {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

class RoleService {
  // Get all roles with pagination and filtering
  async getRoles(params: RoleListParams = {}): Promise<PaginationResponse<{ roles: Role[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.ROLES}?${queryParams.toString()}`;
    return await apiService.get<{ roles: Role[] }>(url) as PaginationResponse<{ roles: Role[] }>;
  }

  // Get role by ID
  async getRoleById(id: string): Promise<Role> {
    const response = await apiService.get<{ role: Role }>(API_CONFIG.ENDPOINTS.ROLE_BY_ID(id));
    if (response.success && response.data) {
      return response.data.role;
    }
    throw new Error(response.message || 'Failed to get role');
  }

  // Create new role
  async createRole(roleData: CreateRoleForm): Promise<Role> {
    const response = await apiService.post<{ role: Role }>(
      API_CONFIG.ENDPOINTS.ROLES,
      roleData
    );

    if (response.success && response.data) {
      return response.data.role;
    }
    throw new Error(response.message || 'Failed to create role');
  }

  // Update role
  async updateRole(id: string, roleData: UpdateRoleForm): Promise<Role> {
    const response = await apiService.put<{ role: Role }>(
      API_CONFIG.ENDPOINTS.ROLE_BY_ID(id),
      roleData
    );

    if (response.success && response.data) {
      return response.data.role;
    }
    throw new Error(response.message || 'Failed to update role');
  }

  // Delete role (soft delete)
  async deleteRole(id: string): Promise<void> {
    const response = await apiService.delete(API_CONFIG.ENDPOINTS.ROLE_BY_ID(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete role');
    }
  }

  // Activate role
  async activateRole(id: string): Promise<void> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.ACTIVATE_ROLE(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to activate role');
    }
  }

  // Get role permissions
  async getRolePermissions(id: string): Promise<Permission[]> {
    const response = await apiService.get<{ permissions: Permission[] }>(
      API_CONFIG.ENDPOINTS.ROLE_PERMISSIONS(id)
    );
    if (response.success && response.data) {
      return response.data.permissions;
    }
    throw new Error(response.message || 'Failed to get role permissions');
  }

  // Update role permissions
  async updateRolePermissions(id: string, permissionIds: string[]): Promise<void> {
    const response = await apiService.put(
      API_CONFIG.ENDPOINTS.ROLE_PERMISSIONS(id),
      { permissions: permissionIds }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update role permissions');
    }
  }

  // Get available permissions grouped by module
  async getAvailablePermissions(): Promise<Record<string, Permission[]>> {
    const response = await apiService.get<{ permissions: Record<string, Permission[]> }>(
      API_CONFIG.ENDPOINTS.AVAILABLE_PERMISSIONS
    );
    if (response.success && response.data) {
      return response.data.permissions;
    }
    throw new Error(response.message || 'Failed to get permissions');
  }

  // Get all available permissions as flat array
  async getAllPermissions(): Promise<Permission[]> {
    const groupedPermissions = await this.getAvailablePermissions();
    const allPermissions: Permission[] = [];
    
    Object.values(groupedPermissions).forEach(permissions => {
      allPermissions.push(...permissions);
    });
    
    return allPermissions;
  }

  // Get all roles for dropdown (no pagination)
  async getAllRoles(): Promise<Role[]> {
    const response = await this.getRoles({ limit: 100 });
    return response.data?.roles || [];
  }

  // Bulk operations
  async bulkActivateRoles(roleIds: string[]): Promise<void> {
    const promises = roleIds.map(id => this.activateRole(id));
    await Promise.all(promises);
  }

  async bulkDeleteRoles(roleIds: string[]): Promise<void> {
    const promises = roleIds.map(id => this.deleteRole(id));
    await Promise.all(promises);
  }

  // Get role usage statistics (placeholder - backend not implemented yet)
  async getRoleUsage(id: string): Promise<{ userCount: number; isDefault: boolean }> {
    // This is a placeholder until the backend implements this endpoint
    // For now, we'll return default values
    const role = await this.getRoleById(id);
    return { userCount: 0, isDefault: role.isDefault || false };
  }

  // Get permission modules
  getPermissionModules(): string[] {
    return ['users', 'roles', 'orders', 'billing', 'stock', 'production', 'godowns', 'customers', 'employees', 'reports', 'settings'];
  }

  // Get permission actions
  getPermissionActions(): string[] {
    return ['create', 'read', 'update', 'delete', 'approve', 'manage'];
  }
}

export const roleService = new RoleService();
export default roleService;
