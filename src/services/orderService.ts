import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { Order, CreateOrderForm, UpdateOrderForm, OrderStatusUpdate, Customer, PaginationResponse } from '../types';

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerOrderHistoryParams {
  page?: number;
  limit?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

class OrderService {
  // Get all orders with pagination and filtering
  async getOrders(params: OrderListParams = {}): Promise<PaginationResponse<{ orders: Order[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.ORDERS}?${queryParams.toString()}`;
    return await apiService.get<{ orders: Order[] }>(url) as PaginationResponse<{ orders: Order[] }>;
  }

  // Get order by ID
  async getOrderById(id: string): Promise<Order> {
    const response = await apiService.get<{ order: Order }>(API_CONFIG.ENDPOINTS.ORDER_BY_ID(id));
    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to get order');
  }

  // Create new order
  async createOrder(orderData: CreateOrderForm): Promise<Order> {
    const response = await apiService.post<{ order: Order }>(
      API_CONFIG.ENDPOINTS.ORDERS,
      orderData
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to create order');
  }

  // Update order
  async updateOrder(id: string, orderData: UpdateOrderForm): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      API_CONFIG.ENDPOINTS.ORDER_BY_ID(id),
      orderData
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to update order');
  }

  // Update order status
  async updateOrderStatus(id: string, statusUpdate: OrderStatusUpdate): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      API_CONFIG.ENDPOINTS.ORDER_STATUS(id),
      statusUpdate
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to update order status');
  }

  // Approve order
  async approveOrder(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/approve`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to approve order');
  }

  // Reject order
  async rejectOrder(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/reject`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to reject order');
  }

  // Get pending orders for approval
  async getPendingOrdersForApproval(params: OrderListParams = {}): Promise<PaginationResponse<{ orders: Order[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.ORDERS}/pending/approval?${queryParams.toString()}`;
    return await apiService.get<{ orders: Order[] }>(url) as PaginationResponse<{ orders: Order[] }>;
  }

  // Move order to production
  async moveToProduction(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/production`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to move order to production');
  }

  // Mark order as ready for dispatch
  async markAsReady(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/ready`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to mark order as ready');
  }

  // Dispatch order
  async dispatchOrder(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/dispatch`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to dispatch order');
  }

  // Mark order as delivered
  async markAsDelivered(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/delivered`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to mark order as delivered');
  }

  // Complete order
  async completeOrder(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/complete`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to complete order');
  }

  // Cancel order
  async cancelOrder(id: string, notes?: string): Promise<Order> {
    const response = await apiService.put<{ order: Order }>(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${id}/cancel`,
      { notes }
    );

    if (response.success && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to cancel order');
  }

  // Get orders by status
  async getOrdersByStatus(status: string, params: OrderListParams = {}): Promise<PaginationResponse<{ orders: Order[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.ORDERS}/status/${status}?${queryParams.toString()}`;
    return await apiService.get<{ orders: Order[] }>(url) as PaginationResponse<{ orders: Order[] }>;
  }

  // Get customer order history
  async getCustomerOrderHistory(customerId: string, params: CustomerOrderHistoryParams = {}): Promise<{
    customer: Pick<Customer, '_id' | 'customerId' | 'businessName' | 'contactPersonName'>;
    orders: Order[];
    statistics: {
      totalOrders: number;
      totalValue: number;
      avgOrderValue: number;
    };
    pagination: {
      currentPage: number;
      totalPages: number;
      totalOrders: number;
      limit: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.CUSTOMER_ORDER_HISTORY(customerId)}?${queryParams.toString()}`;
    const response = await apiService.get<{
      customer: Pick<Customer, '_id' | 'customerId' | 'businessName' | 'contactPersonName'>;
      orders: Order[];
      statistics: {
        totalOrders: number;
        totalValue: number;
        avgOrderValue: number;
      };
      pagination: {
        currentPage: number;
        totalPages: number;
        totalOrders: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(url);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get customer order history');
  }

  // Get order statistics
  async getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    approvedOrders: number;
    completedOrders: number;
    rejectedOrders: number;
    todayOrders: number;
    monthlyRevenue: number;
  }> {
    const response = await apiService.get<{
      totalOrders: number;
      pendingOrders: number;
      approvedOrders: number;
      completedOrders: number;
      rejectedOrders: number;
      todayOrders: number;
      monthlyRevenue: number;
    }>(API_CONFIG.ENDPOINTS.ORDER_STATS);

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get order statistics');
  }

  // Utility methods
  getOrderStatuses(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'All Statuses', value: '', color: 'gray' },
      { label: 'Pending', value: 'pending', color: 'yellow' },
      { label: 'Approved', value: 'approved', color: 'green' },
      { label: 'Rejected', value: 'rejected', color: 'red' },
      { label: 'Processing', value: 'processing', color: 'blue' },
      { label: 'Ready', value: 'ready', color: 'purple' },
      { label: 'Dispatched', value: 'dispatched', color: 'indigo' },
      { label: 'Delivered', value: 'delivered', color: 'teal' },
      { label: 'Completed', value: 'completed', color: 'green' },
      { label: 'Cancelled', value: 'cancelled', color: 'red' },
    ];
  }

  getPaymentStatuses(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'All Payment Status', value: '', color: 'gray' },
      { label: 'Pending', value: 'pending', color: 'yellow' },
      { label: 'Partial', value: 'partial', color: 'orange' },
      { label: 'Paid', value: 'paid', color: 'green' },
      { label: 'Overdue', value: 'overdue', color: 'red' },
    ];
  }

  getProductNames(): string[] {
    return ['Wheat Flour', 'Wheat Bran', 'Custom Product'];
  }

  getUnits(): string[] {
    return ['KG', 'Quintal', 'Ton', 'Bags'];
  }

  getPackagingOptions(): string[] {
    return ['Standard', 'Custom', '25kg Bags', '50kg Bags'];
  }

  getPriorityOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'Low', value: 'low', color: 'gray' },
      { label: 'Normal', value: 'normal', color: 'blue' },
      { label: 'High', value: 'high', color: 'orange' },
      { label: 'Urgent', value: 'urgent', color: 'red' },
    ];
  }

  getPaymentTerms(): string[] {
    return ['Cash', 'Credit', 'Advance'];
  }

  // Status color helpers
  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      ready: 'bg-purple-100 text-purple-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-teal-100 text-teal-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  getPaymentStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  getPriorityColor(priority: string): string {
    const priorityColors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return priorityColors[priority] || 'bg-gray-100 text-gray-800';
  }

  // Formatting helpers
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Calculate order totals
  calculateItemTotal(quantity: number, ratePerUnit: number): number {
    return quantity * ratePerUnit;
  }

  calculateSubtotal(items: Array<{ totalAmount: number }>): number {
    return items.reduce((sum, item) => sum + item.totalAmount, 0);
  }

  calculateTotal(subtotal: number, discount: number, discountPercentage: number, taxAmount: number): number {
    const discountAmount = discountPercentage > 0 ? (subtotal * discountPercentage) / 100 : discount;
    return subtotal - discountAmount + taxAmount;
  }

  // Validation helpers
  validateOrderItem(item: any): string[] {
    const errors: string[] = [];
    
    if (!item.productName) errors.push('Product name is required');
    if (!item.quantity || item.quantity <= 0) errors.push('Quantity must be greater than 0');
    if (!item.unit) errors.push('Unit is required');
    if (!item.ratePerUnit || item.ratePerUnit <= 0) errors.push('Rate per unit must be greater than 0');
    
    return errors;
  }

  validateOrder(order: CreateOrderForm): string[] {
    const errors: string[] = [];
    
    if (!order.customer) errors.push('Customer is required');
    if (!order.items || order.items.length === 0) errors.push('At least one order item is required');
    if (!order.paymentTerms) errors.push('Payment terms are required');
    
    // Validate each item
    order.items?.forEach((item, index) => {
      const itemErrors = this.validateOrderItem(item);
      itemErrors.forEach(error => {
        errors.push(`Item ${index + 1}: ${error}`);
      });
    });
    
    return errors;
  }
}

export const orderService = new OrderService();
export default orderService;

