import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { User, CreateUserForm, UpdateUserForm, PaginationResponse } from '../types';

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: string;
  isActive?: boolean | string;
}

class UserService {
  // Get all users with pagination and filtering
  async getUsers(params: UserListParams = {}): Promise<PaginationResponse<{ users: User[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.USERS}?${queryParams.toString()}`;
    return await apiService.get<{ users: User[] }>(url);
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const response = await apiService.get<{ user: User }>(API_CONFIG.ENDPOINTS.USER_BY_ID(id));
    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.message || 'Failed to get user');
  }

  // Create new user
  async createUser(userData: CreateUserForm): Promise<User> {
    const formData = new FormData();
    
    // Add text fields
    formData.append('firstName', userData.firstName);
    formData.append('lastName', userData.lastName);
    formData.append('email', userData.email);
    formData.append('phone', userData.phone);
    formData.append('password', userData.password);
    formData.append('roleId', userData.roleId);
    formData.append('department', userData.department);
    formData.append('position', userData.position);
    
    // Add profile photo if provided
    if (userData.profilePhoto) {
      formData.append('profilePhoto', userData.profilePhoto);
    }

    const response = await apiService.post<{ user: User }>(
      API_CONFIG.ENDPOINTS.USERS,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.message || 'Failed to create user');
  }

  // Update user
  async updateUser(id: string, userData: UpdateUserForm): Promise<User> {
    const formData = new FormData();
    
    // Add text fields (only if provided)
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'profilePhoto') {
        formData.append(key, String(value));
      }
    });
    
    // Add profile photo if provided
    if (userData.profilePhoto) {
      formData.append('profilePhoto', userData.profilePhoto);
    }

    const response = await apiService.put<{ user: User }>(
      API_CONFIG.ENDPOINTS.USER_BY_ID(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.message || 'Failed to update user');
  }

  // Delete user (soft delete)
  async deleteUser(id: string): Promise<void> {
    const response = await apiService.delete(API_CONFIG.ENDPOINTS.USER_BY_ID(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete user');
    }
  }

  // Activate user
  async activateUser(id: string): Promise<void> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.ACTIVATE_USER(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to activate user');
    }
  }

  // Get departments list
  getDepartments(): string[] {
    return ['Sales', 'Production', 'Management', 'Admin', 'Warehouse', 'Finance'];
  }

  // Get user status options
  getStatusOptions(): { label: string; value: string }[] {
    return [
      { label: 'All Users', value: '' },
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ];
  }
}

export const userService = new UserService();
export default userService;
