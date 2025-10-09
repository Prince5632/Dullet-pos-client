import type { 
  ApiResponse, 
  PaginationResponse, 
  Inventory, 
  CreateInventoryForm, 
  UpdateInventoryForm, 
  InventoryListParams,
  InventoryStats 
} from '../types';
import { apiService } from './api';
import { API_CONFIG } from '../config/api';

class InventoryService {

  // Get all inventory with filters and pagination
  async getInventories(params: InventoryListParams = {}): Promise<ApiResponse<PaginationResponse<Inventory>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await apiService.get(`${API_CONFIG.ENDPOINTS.INVENTORY}?${queryParams.toString()}`);
    return response;
  }

  // Get inventory by ID
  async getInventoryById(id: string): Promise<ApiResponse<Inventory>> {
    const response = await apiService.get(API_CONFIG.ENDPOINTS.INVENTORY_BY_ID(id));
    return response;
  }

  // Create new inventory
  async createInventory(data: CreateInventoryForm): Promise<ApiResponse<Inventory>> {
    const response = await apiService.post(API_CONFIG.ENDPOINTS.INVENTORY, data);
    return response;
  }

  // Update inventory
  async updateInventory(id: string, data: UpdateInventoryForm): Promise<ApiResponse<Inventory>> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.INVENTORY_BY_ID(id), data);
    return response.data;
  }

  // Delete inventory
  async deleteInventory(id: string): Promise<ApiResponse<void>> {
    const response = await apiService.delete(API_CONFIG.ENDPOINTS.INVENTORY_BY_ID(id));
    return response.data;
  }

  // Get inventory statistics
  async getInventoryStats(params: { 
    inventoryType?: string; 
    godownId?: string; 
    dateFrom?: string; 
    dateTo?: string; 
  } = {}): Promise<ApiResponse<InventoryStats>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await apiService.get(`${API_CONFIG.ENDPOINTS.INVENTORY_STATS}?${queryParams.toString()}`);
    return response.data;
  }

  // Get inventory by godown
  async getInventoryByGodown(
    godownId: string, 
    params: { page?: number; limit?: number; inventoryType?: string } = {}
  ): Promise<ApiResponse<PaginationResponse<Inventory>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await apiService.get(`${API_CONFIG.ENDPOINTS.INVENTORY_BY_GODOWN(godownId)}?${queryParams.toString()}`);
    return response.data;
  }

  // Format inventory type for display
  formatInventoryType(type: string): string {
    const typeMap: Record<string, string> = {
      'New Stock': 'New Stock',
      'Stock Sold': 'Stock Sold',
      'Damaged / Return': 'Damaged / Return'
    };
    return typeMap[type] || type;
  }

  // Format unit for display
  formatUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'Kg': 'Kg',
      'Quintal': 'Quintal'
    };
    return unitMap[unit] || unit;
  }

  // Format quantity with unit
  formatQuantityWithUnit(quantity: number, unit: string): string {
    if(unit === "40Kg Bag" || unit === "50Kg Bag"){
      return `${quantity} × ${this.formatUnit(unit)}`;
    }
    return `${quantity} ${this.formatUnit(unit)}`;
  }

  // Get inventory type color for UI
  getInventoryTypeColor(type: string): string {
    const colorMap: Record<string, string> = {
      'New Stock': 'success',
      'Stock Sold': 'primary',
      'Damaged / Return': 'danger'
    };
    return colorMap[type] || 'secondary';
  }

  // Get inventory type badge variant
  getInventoryTypeBadgeVariant(type: string): 'success' | 'primary' | 'danger' | 'secondary' {
    const variantMap: Record<string, 'success' | 'primary' | 'danger' | 'secondary'> = {
      'New Stock': 'success',
      'Stock Sold': 'primary',
      'Damaged / Return': 'danger'
    };
    return variantMap[type] || 'secondary';
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Format datetime for display
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format price for display
  formatPrice(price?: number): string {
    if (price === undefined || price === null) return 'N/A';
    return `₹${price.toFixed(2)}`;
  }

  // Calculate total value with unit conversion
  calculateTotalValue(quantity: number, pricePerKg?: number, unit?: string): number {
    if (!pricePerKg) return 0;
    
    // Convert quantity to kg based on unit
    let quantityInKg = quantity;
    if (unit) {
      switch (unit.toLowerCase()) {
        case 'quintal':
          quantityInKg = quantity * 100; // 1 quintal = 100 kg
          break;
        case 'kg':
        case 'kilogram':
          quantityInKg = quantity; // already in kg
          break;
        case 'g':
        case 'gram':
          quantityInKg = quantity / 1000; // 1000 g = 1 kg
          break;
        case 'ton':
          quantityInKg = quantity * 1000; // 1 ton = 1000 kg
          break;
        default:
          // For other units (bag, piece, liter, ml), use quantity as is
          quantityInKg = quantity;
          break;
      }
    }
    
    return quantityInKg * pricePerKg;
  }

  // Format total value for display with unit conversion
  formatTotalValue(quantity: number, pricePerKg?: number, unit?: string): string {
    const total = this.calculateTotalValue(quantity, pricePerKg, unit);
    return total > 0 ? `₹${total.toFixed(2)}` : 'N/A';
  }

  // Get inventory audit trail
  async getInventoryAuditTrail(id: string, params: { page?: number; limit?: number } = {}): Promise<{
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

    const url = `${API_CONFIG.ENDPOINTS.INVENTORY_BY_ID(id)}/audit-trail?${queryParams.toString()}`;
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
      return response.data || {};
    }
    throw new Error(response.message || 'Failed to get inventory audit trail');
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;