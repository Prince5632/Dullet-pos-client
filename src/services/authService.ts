import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { LoginRequest, LoginResponse, User, ChangePasswordForm } from '../types';

class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('email', credentials.email);
    formData.append('password', credentials.password);
    
    if (credentials.faceImage) {
      formData.append('faceImage', credentials.faceImage);
    }

    const response = await apiService.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.LOGIN,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.success && response.data) {
      // Set token in API service
      apiService.setToken(response.data.token);
      
      // Store user data
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiService.post(API_CONFIG.ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and token regardless of API call success
      this.clearAuthData();
    }
  }

  // Get current user profile
  async getProfile(): Promise<User> {
    const response = await apiService.get<{ user: User }>(API_CONFIG.ENDPOINTS.PROFILE);
    
    if (response.success && response.data) {
      // Update stored user data
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      return response.data.user;
    }

    throw new Error(response.message || 'Failed to get profile');
  }

  // Change password
  async changePassword(data: ChangePasswordForm): Promise<void> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to change password');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = apiService.getToken();
    const userData = this.getCurrentUser();
    return !!(token && userData);
  }

  // Get current user from localStorage
  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Check if user has specific permission
  hasPermission(permissionName: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.role || !user.role.permissions) return false;

    return user.role.permissions.some(permission => permission.name === permissionName);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  // Check if user has all specified permissions
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // Check if user has specific role
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    return user?.role?.name === roleName;
  }

  // Clear authentication data
  clearAuthData(): void {
    apiService.clearToken();
    localStorage.removeItem('user_data');
  }

  // Get user's permissions list
  getUserPermissions(): string[] {
    const user = this.getCurrentUser();
    if (!user || !user.role || !user.role.permissions) return [];
    
    return user.role.permissions.map(permission => permission.name);
  }

  // Get user's role name
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role?.name || null;
  }

  // Get user's department
  getUserDepartment(): string | null {
    const user = this.getCurrentUser();
    return user?.department || null;
  }
}

export const authService = new AuthService();
export default authService;
