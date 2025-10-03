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

    // Add address information
    if (userData.address) {
      formData.append('address', JSON.stringify(userData.address));
    }

    // Identification numbers
    if (userData.aadhaarNumber) {
      formData.append('aadhaarNumber', userData.aadhaarNumber);
    }

    if (userData.panNumber) {
      formData.append('panNumber', userData.panNumber);
    }

    // Identification documents
    if (userData.aadhaarDocument) {
      formData.append('aadhaarDocument', userData.aadhaarDocument);
    }

    if (userData.panDocument) {
      formData.append('panDocument', userData.panDocument);
    }

    if (Array.isArray(userData.otherDocuments) && userData.otherDocuments.length) {
      userData.otherDocuments.forEach((file) => {
        formData.append('otherDocuments', file);
      });
    }

    if (Array.isArray(userData.otherDocumentsMeta) && userData.otherDocumentsMeta.length) {
      formData.append('otherDocumentsMeta', JSON.stringify(userData.otherDocumentsMeta));
    }

    // Add godown assignments
    if (userData.primaryGodownId) {
      formData.append('primaryGodown', userData.primaryGodownId);
    }
    if (Array.isArray(userData.accessibleGodownIds)) {
      userData.accessibleGodownIds.forEach((id) => formData.append('accessibleGodowns', id));
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
      if (
        value === undefined ||
        value === null ||
        key === 'profilePhoto' ||
        key === 'accessibleGodownIds' ||
        key === 'primaryGodownId' ||
        key === 'aadhaarDocument' ||
        key === 'panDocument' ||
        key === 'address'
      ) {
        return;
      }

      formData.append(key, String(value));
    });

    if (userData.address) {
      formData.append('address', JSON.stringify(userData.address));
    }
    
    // Add profile photo if provided
    if (userData.profilePhoto) {
      formData.append('profilePhoto', userData.profilePhoto);
    }

    if (userData.aadhaarDocument) {
      formData.append('aadhaarDocument', userData.aadhaarDocument);
    }

    if (userData.panDocument) {
      formData.append('panDocument', userData.panDocument);
    }

    if (Array.isArray(userData.otherDocuments) && userData.otherDocuments.length) {
      userData.otherDocuments.forEach((file) => {
        formData.append('otherDocuments', file);
      });
    }

    if (Array.isArray(userData.otherDocumentsMeta) && userData.otherDocumentsMeta.length) {
      formData.append('otherDocumentsMeta', JSON.stringify(userData.otherDocumentsMeta));
    }

    if (Array.isArray(userData.removeDocumentIds) && userData.removeDocumentIds.length) {
      formData.append('removeDocumentIds', JSON.stringify(userData.removeDocumentIds));
    }

    // Add godown assignments if provided
    if (userData.primaryGodownId) {
      formData.append('primaryGodown', userData.primaryGodownId);
    }
    if (Array.isArray(userData.accessibleGodownIds)) {
      userData.accessibleGodownIds.forEach((id) => formData.append('accessibleGodowns', id));
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

  // Deactivate user (set isActive to false)
  async deactivateUser(id: string): Promise<void> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.DEACTIVATE_USER(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to deactivate user');
    }
  }

  // Bulk operations
  async bulkActivateUsers(userIds: string[]): Promise<void> {
    const promises = userIds.map(id => this.activateUser(id));
    await Promise.all(promises);
  }

  async bulkDeactivateUsers(userIds: string[]): Promise<void> {
    const promises = userIds.map(id => this.deactivateUser(id));
    await Promise.all(promises);
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    const promises = userIds.map(id => this.deleteUser(id));
    await Promise.all(promises);
  }

  // Change user password (admin function)
  async changeUserPassword(id: string, newPassword: string): Promise<void> {
    const response = await apiService.put(`${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/password`, {
      password: newPassword
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to change user password');
    }
  }

  // Get user activity/audit logs
  async getUserActivity(id: string, params: { page?: number; limit?: number } = {}): Promise<{
    activities: any[];
    pagination: {
      currentPage: number;
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.USER_BY_ID(id)}/activity?${queryParams.toString()}`;
    const response = await apiService.get<{
      activities: any[];
      pagination: {
        currentPage: number;
        totalItems: number;
        itemsPerPage: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(url);
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get user activity');
  }

  // Export users to CSV
  async exportUsers(filters: UserListParams = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.USERS}/export?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export users');
    }

    return await response.blob();
  }

  // Import users from CSV
  async importUsers(file: File): Promise<{ success: number; failed: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiService.post<{ success: number; failed: number; errors: string[] }>(
      `${API_CONFIG.ENDPOINTS.USERS}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to import users');
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

  // Get user statistics
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    todayLogins: number;
    inactiveUsers: number;
  }> {
    const response = await apiService.get<{
      totalUsers: number;
      activeUsers: number;
      todayLogins: number;
      inactiveUsers: number;
    }>('/api/users/stats/summary');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to get user statistics');
  }
}

export const userService = new UserService();
export default userService;
