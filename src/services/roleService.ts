import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { Role, Permission, PaginationResponse } from '../types';

export interface RoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | string;
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
    return await apiService.get<{ roles: Role[] }>(url);
  }

  // Get role by ID
  async getRoleById(id: string): Promise<Role> {
    const response = await apiService.get<{ role: Role }>(API_CONFIG.ENDPOINTS.ROLE_BY_ID(id));
    if (response.success && response.data) {
      return response.data.role;
    }
    throw new Error(response.message || 'Failed to get role');
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

  // Get all roles for dropdown (no pagination)
  async getAllRoles(): Promise<Role[]> {
    const response = await this.getRoles({ limit: 100 });
    return response.data?.roles || [];
  }
}

export const roleService = new RoleService();
export default roleService;
