import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type {
  Transit,
  CreateTransitForm,
  UpdateTransitForm,
  TransitStatusUpdate,
  TransitListParams,
  TransitStats,
  ApiResponse,
  PaginationResponse
} from '../types';

class TransitService {
  // Get all transits with pagination and filtering
  async getTransits(params: TransitListParams = {}): Promise<ApiResponse<{ transits: Transit[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.TRANSITS}?${queryParams.toString()}`;
    return await apiService.get<{ transits: Transit[] }>(url);
  }

  // Get transit by ID
  async getTransitById(id: string): Promise<ApiResponse<Transit>> {
    return await apiService.get<Transit>(API_CONFIG.ENDPOINTS.TRANSIT_BY_ID(id));
  }

  // Get transit by transit ID
  async getTransitByTransitId(transitId: string): Promise<ApiResponse<Transit>> {
    return await apiService.get<Transit>(API_CONFIG.ENDPOINTS.TRANSIT_BY_TRANSIT_ID(transitId));
  }

  // Create new transit
  async createTransit(transitData: CreateTransitForm): Promise<ApiResponse<Transit>> {
    const formData = new FormData();
    
    // Add basic fields matching the schema
    formData.append('fromLocation', transitData.fromLocation);
    formData.append('toLocation', transitData.toLocation);
    formData.append('dateOfDispatch', transitData.dateOfDispatch);
    formData.append('vehicleNumber', transitData.vehicleNumber);
    
    // Add product details array
    formData.append('productDetails', JSON.stringify(transitData.productDetails));
    
    // Add optional fields
    if (transitData.expectedArrivalDate) {
      formData.append('expectedArrivalDate', transitData.expectedArrivalDate);
    }
    
    if (transitData.vehicleType) {
      formData.append('vehicleType', transitData.vehicleType);
    }
    
    if (transitData.driverId) {
      formData.append('driverId', transitData.driverId);
    }
    
    if (transitData.assignedTo) {
      formData.append('assignedTo', transitData.assignedTo);
    }
    
    if (transitData.transporterName) {
      formData.append('transporterName', transitData.transporterName);
    }
    
    if (transitData.remarks) {
      formData.append('remarks', transitData.remarks);
    }

    // Add attachments
    if (transitData.attachments && transitData.attachments.length > 0) {
      transitData.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    return await apiService.post<Transit>(API_CONFIG.ENDPOINTS.TRANSITS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Update transit
  async updateTransit(id: string, transitData: UpdateTransitForm): Promise<ApiResponse<Transit>> {
    const formData = new FormData();
    
    Object.entries(transitData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'productDetails' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'attachments' && Array.isArray(value)) {
          value.forEach((file) => {
            formData.append('attachments', file);
          });
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return await apiService.put<Transit>(API_CONFIG.ENDPOINTS.TRANSIT_BY_ID(id), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Delete transit
  async deleteTransit(id: string): Promise<ApiResponse<void>> {
    return await apiService.delete<void>(API_CONFIG.ENDPOINTS.TRANSIT_BY_ID(id));
  }

  // Update transit status
  async updateTransitStatus(id: string, statusData: TransitStatusUpdate): Promise<ApiResponse<Transit>> {
    return await apiService.patch<Transit>(API_CONFIG.ENDPOINTS.TRANSIT_UPDATE_STATUS(id), statusData);
  }

  // Assign driver to transit
  async assignDriver(id: string, driverId: string, notes?: string): Promise<ApiResponse<Transit>> {
    return await apiService.patch<Transit>(API_CONFIG.ENDPOINTS.TRANSIT_ASSIGN_DRIVER(id), {
      driverId,
      notes
    });
  }

  // Get transit statistics
  async getTransitStats(): Promise<ApiResponse<TransitStats>> {
    return await apiService.get<TransitStats>(API_CONFIG.ENDPOINTS.TRANSIT_STATS);
  }

  // Get transits by location
  async getTransitsByLocation(location: string): Promise<ApiResponse<{ transits: Transit[] }>> {
    return await apiService.get<{ transits: Transit[] }>(API_CONFIG.ENDPOINTS.TRANSIT_BY_LOCATION(location));
  }

  // Bulk update transit status
  async bulkUpdateTransitStatus(transitIds: string[], status: string, notes?: string): Promise<ApiResponse<{ updated: number }>> {
    return await apiService.patch<{ updated: number }>(API_CONFIG.ENDPOINTS.TRANSIT_BULK_UPDATE_STATUS, {
      transitIds,
      status,
      notes
    });
  }

  // Get pending transits
  async getPendingTransits(): Promise<ApiResponse<{ transits: Transit[] }>> {
    return await apiService.get<{ transits: Transit[] }>(API_CONFIG.ENDPOINTS.TRANSIT_PENDING);
  }

  // Get my transits (for drivers)
  async getMyTransits(): Promise<ApiResponse<{ transits: Transit[] }>> {
    return await apiService.get<{ transits: Transit[] }>(API_CONFIG.ENDPOINTS.TRANSIT_MY_TRANSITS);
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'New':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Partially Received':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  formatTransitId(transitId: string): string {
    return transitId.toUpperCase();
  }

  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} hrs`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return `${days}d ${remainingHours}h`;
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'New':
        return 'New';
      case 'In Transit':
        return 'In Transit';
      case 'Received':
        return 'Received';
      case 'Partially Received':
        return 'Partially Received';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
}

export const transitService = new TransitService();