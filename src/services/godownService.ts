import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { ApiResponse, Godown } from '../types';

class GodownService {
  // Get all godowns with optional filter parameters for counts
  async getGodowns(params: { 
    search?: string;
    status?: string;
    paymentStatus?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
    priority?: string;
    minAmount?: string;
    maxAmount?: string;
    // Visit-specific filters
    scheduleStatus?: string;
    onlySalesExecutive?: boolean;
    visitStatus?: string;
    hasImage?: string;
    address?: string;
    roleId?: string;
  } = {}): Promise<ApiResponse<{ godowns: Godown[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = queryParams.toString() 
      ? `${API_CONFIG.ENDPOINTS.GODOWNS}?${queryParams.toString()}`
      : API_CONFIG.ENDPOINTS.GODOWNS;

    const response = await apiService.get<{ godowns: Godown[] }>(url);
    if (response.data) {
      return response;
    }

    return {
      success: response.success,
      message: response.message,
      data: { godowns: [] }
    };
  }

  // Get godowns with customer counts for customer reports
  async getGodownsForCustomerReports(params: {
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<ApiResponse<Godown[]>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = queryParams.toString() 
      ? `/api/reports/customers/godowns?${queryParams.toString()}`
      : '/api/reports/customers/godowns';

    const response = await apiService.get<Godown[]>(url);
    if (response.data) {
      return response;
    }

    return {
      success: response.success,
      message: response.message,
      data: []
    };
  }

  // Get godown by ID
  async getGodownById(id: string): Promise<Godown> {
    const response = await apiService.get<Godown>(API_CONFIG.ENDPOINTS.GODOWN_BY_ID(id));
    if (!response.data) {
      throw new Error('Godown not found');
    }
    return response.data;
  }
}

export const godownService = new GodownService();
