import { API_CONFIG } from '../config/api';
import type { ApiResponse } from '../types';
import apiService from './api';

// Production types
export interface Production {
  _id: string;
  batchId: string;
  productionDate: string;
  shift: 'Day' | 'Night';
  location: string;
  machine: string;
  operator: {
    _id: string;
    name: string;
    email: string;
  };
  inputType: string;
  inputQty: number;
  inputUnit: string;
  outputDetails: {
    itemName: string;
    productQty: number;
    productUnit: string;
    notes?: string;
  }[];
  attachments?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    base64Data: string;
    uploadedAt: string;
  }[];
  remarks?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  totalOutputQty: number;
  conversionEfficiency: number;
}

export interface CreateProductionForm {
  productionDate: string;
  shift: 'Day' | 'Night';
  location: string;
  machine: string;
  operator: string;
  inputType: string;
  inputQty: number;
  inputUnit: string;
  outputDetails: {
    itemName: string;
    productQty: number;
    productUnit: string;
    notes?: string;
  }[];
  remarks?: string;
  attachments: File[];
}

export interface UpdateProductionForm extends CreateProductionForm {
  removedAttachments?: string[];
}

export interface ProductionStats {
  totalProductions: number;
  totalInputQty: number;
  totalOutputQty: number;
  averageEfficiency: number;
  productionsByShift: {
    Day: number;
    Night: number;
  };
  productionsByLocation: {
    [key: string]: number;
  };
  recentProductions: Production[];
}

export interface ProductionFilters {
  page?: number;
  limit?: number;
  search?: string;
  shift?: string;
  location?: string;
  machine?: string;
  operator?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ProductionService {
  // Get all productions with filters
  async getProductions(filters: ProductionFilters = {}): Promise<ApiResponse<Production[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const url = queryString ? `${API_CONFIG.ENDPOINTS.PRODUCTIONS}?${queryString}` : API_CONFIG.ENDPOINTS.PRODUCTIONS;
    
    return await apiService.get<Production[]>(url);
  }

  // Get production by ID
  async getProductionById(id: string): Promise<ApiResponse<Production>> {
    return await apiService.get<Production>(API_CONFIG.ENDPOINTS.PRODUCTION_BY_ID(id));
  }

  // Get production by batch ID
  async getProductionByBatchId(batchId: string): Promise<ApiResponse<Production>> {
    return await apiService.get<Production>(API_CONFIG.ENDPOINTS.PRODUCTION_BY_BATCH_ID(batchId));
  }

  // Create production
  async createProduction(productionData: CreateProductionForm): Promise<ApiResponse<Production>> {
    const formData = new FormData();

    // Add all form fields to FormData
    Object.entries(productionData).forEach(([key, value]) => {
      if (key === 'outputDetails' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'attachments' && Array.isArray(value)) {
        value.forEach((file) => {
          formData.append('attachments', file);
        });
      } else {
        formData.append(key, String(value));
      }
    });

    return await apiService.post<Production>(API_CONFIG.ENDPOINTS.PRODUCTIONS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Update production
  async updateProduction(id: string, productionData: UpdateProductionForm): Promise<ApiResponse<Production>> {
    const formData = new FormData();

    // Add all form fields to FormData
    Object.entries(productionData).forEach(([key, value]) => {
      if (key === 'outputDetails' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else if (key === 'attachments' && Array.isArray(value)) {
        value.forEach((file) => {
          formData.append('attachments', file);
        });
      } else if (key === 'removedAttachments' && Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    return await apiService.put<Production>(API_CONFIG.ENDPOINTS.PRODUCTION_BY_ID(id), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Delete production
  async deleteProduction(id: string): Promise<ApiResponse<void>> {
    return await apiService.delete<void>(API_CONFIG.ENDPOINTS.PRODUCTION_BY_ID(id));
  }

  // Get production statistics
  async getProductionStats(): Promise<ApiResponse<ProductionStats>> {
    return await apiService.get<ProductionStats>(API_CONFIG.ENDPOINTS.PRODUCTION_STATS);
  }

  // Get productions by location
  async getProductionsByLocation(location: string): Promise<ApiResponse<{ productions: Production[] }>> {
    return await apiService.get<{ productions: Production[] }>(API_CONFIG.ENDPOINTS.PRODUCTION_BY_LOCATION(location));
  }

  // Get production summary
  async getProductionSummary(): Promise<ApiResponse<any>> {
    return await apiService.get<any>(API_CONFIG.ENDPOINTS.PRODUCTION_SUMMARY);
  }

  // Get production audit trail
  async getProductionAuditTrail(id: string, page: number = 1, limit: number = 20): Promise<ApiResponse<{
    activities: any[];
    pagination: {
      currentPage: number;
      totalItems: number;
      itemsPerPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>> {
    return await apiService.get<{
      activities: any[];
      pagination: {
        currentPage: number;
        totalItems: number;
        itemsPerPage: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(API_CONFIG.ENDPOINTS.PRODUCTION_AUDIT_TRAIL(id), {
      params: { page, limit }
    });
  }

  // Utility methods
  getShiftColor(shift: string): string {
    switch (shift) {
      case 'Day':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Night':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  formatBatchId(batchId: string): string {
    return batchId.toUpperCase();
  }

  formatEfficiency(efficiency: number): string {
    return `${Math.round(efficiency * 100) / 100}%`;
  }

  getShiftDisplayName(shift: string): string {
    switch (shift) {
      case 'Day':
        return 'Day Shift';
      case 'Night':
        return 'Night Shift';
      default:
        return shift.charAt(0).toUpperCase() + shift.slice(1);
    }
  }
}

export const productionService = new ProductionService();