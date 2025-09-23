import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG, REQUEST_CONFIG } from '../config/api';
import type { ApiResponse } from '../types';
import toast from 'react-hot-toast';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing: boolean = false;
  private requestCache: Map<string, Promise<any>> = new Map();

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: REQUEST_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized) - but avoid infinite loops
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('refresh-token')) {
          originalRequest._retry = true;
          
          // Prevent multiple simultaneous refresh attempts
          if (this.isRefreshing) {
            try {
              // Wait for the ongoing refresh to complete
              if (this.refreshPromise) {
                const newToken = await this.refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }

          // Start token refresh process
          this.isRefreshing = true;
          this.refreshPromise = this.performTokenRefresh();

          try {
            const newToken = await this.refreshPromise;
            if (newToken) {
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            this.handleAuthError();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private loadTokenFromStorage() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.setToken(token);
    }
  }

  private saveTokenToStorage(token: string) {
    localStorage.setItem('auth_token', token);
  }

  private clearTokenFromStorage() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  private getRefreshTokenFromStorage(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const refreshToken = this.getRefreshTokenFromStorage();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Create a new axios instance to avoid interceptor loops
      const refreshApi = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        timeout: REQUEST_CONFIG.TIMEOUT,
      });

      const response = await refreshApi.post(API_CONFIG.ENDPOINTS.REFRESH_TOKEN, {
        refreshToken,
      });

      if (response.data.success && response.data.data.token) {
        const newToken = response.data.data.token;
        this.setToken(newToken);
        this.saveTokenToStorage(newToken);
        return newToken;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      this.handleAuthError();
      throw error;
    }
  }

  private handleAuthError() {
    this.clearToken();
    this.clearTokenFromStorage();
    
    // Only show toast and redirect if not already on login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
    }
  }

  private handleApiError(error: any) {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Don't show toast for certain errors
    const silentErrors = [401, 422]; // Unauthorized, Validation errors
    if (!silentErrors.includes(error.response?.status)) {
      toast.error(message);
    }
    
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message,
      data: error.response?.data,
    });
  }

  // Token management
  public setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  public clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  public getToken(): string | null {
    return this.token;
  }

  // API methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  // File upload
  public async uploadFile<T = any>(url: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Refresh token
  private async refreshToken(): Promise<void> {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.REFRESH_TOKEN);
      const newToken = response.data.data.token;
      this.setToken(newToken);
    } catch (error) {
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get(API_CONFIG.ENDPOINTS.HEALTH);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
