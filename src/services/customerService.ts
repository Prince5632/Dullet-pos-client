import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { Customer, CreateCustomerForm, UpdateCustomerForm, PaginationResponse } from '../types';

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: string;
  isActive?: boolean | string;
  state?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CustomerService {
  // Get all customers with pagination and filtering
  async getCustomers(params: CustomerListParams = {}): Promise<PaginationResponse<{ customers: Customer[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.CUSTOMERS}?${queryParams.toString()}`;
    return await apiService.get<{ customers: Customer[] }>(url) as PaginationResponse<{ customers: Customer[] }>;
  }

  // Get customer by ID
  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiService.get<{ customer: Customer }>(API_CONFIG.ENDPOINTS.CUSTOMER_BY_ID(id));
    if (response.success && response.data) {
      return response.data.customer;
    }
    throw new Error(response.message || 'Failed to get customer');
  }

  // Create new customer
  async createCustomer(customerData: CreateCustomerForm): Promise<Customer> {
    const response = await apiService.post<{ customer: Customer }>(
      API_CONFIG.ENDPOINTS.CUSTOMERS,
      customerData
    );

    if (response.success && response.data) {
      return response.data.customer;
    }
    throw new Error(response.message || 'Failed to create customer');
  }

  // Update customer
  async updateCustomer(id: string, customerData: UpdateCustomerForm): Promise<Customer> {
    const response = await apiService.put<{ customer: Customer }>(
      API_CONFIG.ENDPOINTS.CUSTOMER_BY_ID(id),
      customerData
    );

    if (response.success && response.data) {
      return response.data.customer;
    }
    throw new Error(response.message || 'Failed to update customer');
  }

  // Delete customer (soft delete)
  async deleteCustomer(id: string): Promise<void> {
    const response = await apiService.delete(API_CONFIG.ENDPOINTS.CUSTOMER_BY_ID(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete customer');
    }
  }

  // Activate customer
  async activateCustomer(id: string): Promise<void> {
    const response = await apiService.put(API_CONFIG.ENDPOINTS.ACTIVATE_CUSTOMER(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to activate customer');
    }
  }

  // Get customer statistics
  async getCustomerStats(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    recentCustomers: number;
  }> {
    const response = await apiService.get<{
      totalCustomers: number;
      activeCustomers: number;
      inactiveCustomers: number;
      recentCustomers: number;
    }>(API_CONFIG.ENDPOINTS.CUSTOMER_STATS);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get customer statistics');
  }

  // Get all customers for dropdown (no pagination)
  async getAllCustomers(): Promise<Customer[]> {
    const response = await this.getCustomers({ limit: 1000, isActive: true });
    return response.data?.customers || [];
  }

  // Utility methods
  getCustomerTypes(): Array<{ label: string; value: string }> {
    return [
      { label: 'All Types', value: '' },
      { label: 'Retailer', value: 'Retailer' },
      { label: 'Distributor', value: 'Distributor' },
      { label: 'Wholesaler', value: 'Wholesaler' },
    ];
  }

  getStates(): string[] {
    return [
      'Punjab', 'Haryana', 'Himachal Pradesh', 'Rajasthan', 'Uttar Pradesh',
      'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Other'
    ];
  }

  formatCustomerDisplay(customer: Customer): string {
    return `${customer.businessName} (${customer.customerId})`;
  }

  calculateCreditUtilization(customer: Customer): number {
    if (customer.creditLimit <= 0) return 0;
    return Math.round((customer.outstandingAmount / customer.creditLimit) * 100);
  }

  getCreditStatusColor(utilization: number): string {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-orange-600';
    if (utilization >= 50) return 'text-yellow-600';
    return 'text-green-600';
  }

  getCreditStatusLabel(utilization: number): string {
    if (utilization >= 90) return 'Critical';
    if (utilization >= 70) return 'High';
    if (utilization >= 50) return 'Medium';
    return 'Good';
  }
}

export const customerService = new CustomerService();
export default customerService;
