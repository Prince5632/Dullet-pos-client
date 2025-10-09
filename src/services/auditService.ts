import apiService from './api';

export interface AuditLog {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
  };
  action: string;
  module: string;
  resourceType: string;
  resourceId: string;
  description: string;
  createdAt: string;
}

export interface AuditFilters {
  module?: string;
  action?: string;
  resourceType?: string;
}

export interface AuditResponse {
  success: boolean;
  message: string;
  data: {
    activities: AuditLog[];
    pagination: {
      currentPage: number;
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

export interface FilterOptions {
  modules: string[];
  actions: string[];
  resourceTypes: string[];
}

export interface ActivityStats {
  totalActivities: number;
  recentActivities: number;
  moduleStats: Array<{ _id: string; count: number }>;
  actionStats: Array<{ _id: string; count: number }>;
}

class AuditService {
  /**
   * Get user activity with pagination and filtering
   */
  async getAllSystemActivity(
    page: number = 1,
    limit: number = 20,
    filters: AuditFilters = {},
    userId?: string
  ): Promise<AuditResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add userId if provided
      if (userId) params.append('userId', userId);

      // Add filters if provided
      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);

      const response = await apiService.get(`/api/audit/activity?${params.toString()}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch user activity');
    }
  }

  /**
   * Get filter options for audit logs
   */
  async getFilterOptions(): Promise<FilterOptions> {
    try {
      const response = await apiService.get('/audit/filters');
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch filter options');
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(): Promise<ActivityStats> {
    try {
      const response = await apiService.get('/audit/stats');
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching activity statistics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch activity statistics');
    }
  }
}

const auditService = new AuditService();
export default auditService;