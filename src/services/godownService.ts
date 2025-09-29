import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { ApiResponse, Godown } from '../types';

class GodownService {
  // Get all godowns
  async getGodowns(): Promise<ApiResponse<{ godowns: Godown[] }>> {
    const response = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
    if (response.data) {
      return response;
    }

    return {
      success: response.success,
      message: response.message,
      data: { godowns: [] }
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
