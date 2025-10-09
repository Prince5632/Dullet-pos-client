import { apiService } from './api';
import { API_CONFIG, APP_CONFIG } from '../config/api';
import type { LoginRequest, LoginResponse, User, ChangePasswordForm } from '../types';

class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const formData = new FormData();
      if (credentials.identifier) {
        formData.append('identifier', credentials.identifier);
      } else if (credentials.email) {
        formData.append('email', credentials.email);
      }
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
        console.log('[AuthService] Login API successful, storing tokens and user data');
        
        // Set token in API service first
        apiService.setToken(response.data.token);
        console.log('[AuthService] Token set in API service');
        
        // Store user data and refresh token synchronously
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        console.log('[AuthService] User data stored in localStorage');
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
          console.log('[AuthService] Refresh token stored');
        }
        
        // Store login timestamp for session management
        localStorage.setItem('login_timestamp', Date.now().toString());
        console.log('[AuthService] Login timestamp stored');
        
        // Verify token storage
        const storedToken = localStorage.getItem('auth_token');
        if (!storedToken) {
          console.error('[AuthService] WARNING: Token not found in localStorage after storage attempt');
        } else {
          console.log('[AuthService] Token storage verified successfully');
        }
        
        return response.data;
      }

      throw new Error(response.message || 'Login failed');
    } catch (error: any) {
      // Extract the server error message from the API error response
      const serverMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(serverMessage);
    }
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
    
    if (!token || !userData) {
      return false;
    }

    // Check if session has expired based on login timestamp
    return this.isSessionValid();
  }

  // Check if current session is still valid
  isSessionValid(): boolean {
    try {
      const loginTimestamp = localStorage.getItem('login_timestamp');
      if (!loginTimestamp) {
        return false;
      }

      const loginTime = parseInt(loginTimestamp);
      const currentTime = Date.now();
      const sessionTimeout = APP_CONFIG.SESSION_TIMEOUT;
      
      return (currentTime - loginTime) < sessionTimeout;
    } catch {
      return false;
    }
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

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser();
    return user?._id || null;
  }

  // Clear authentication data
  clearAuthData(): void {
    apiService.clearToken();
    localStorage.removeItem('user_data');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('login_timestamp');
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

  // Refresh session timestamp (call this on user activity)
  refreshSession(): void {
    if (this.isAuthenticated()) {
      localStorage.setItem('login_timestamp', Date.now().toString());
    }
  }

  // Attempt to refresh token if session is expired but refresh token exists
  async attemptTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return false;
      }

      const response = await apiService.post<LoginResponse>(API_CONFIG.ENDPOINTS.REFRESH_TOKEN, {
        refreshToken
      });

      if (response.success && response.data) {
        // Update tokens and session
        apiService.setToken(response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        localStorage.setItem('login_timestamp', Date.now().toString());
        
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuthData();
      return false;
    }
  }

}

export const authService = new AuthService();
export default authService;
