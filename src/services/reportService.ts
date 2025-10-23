import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export interface SalesExecutiveReport {
  _id: string;
  executiveName: string;
  employeeId: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  roleName: string;
  totalOrders: number;
  totalRevenue: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  avgOrderValue: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  uniqueCustomersCount: number;
  conversionRate: number;
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  daysSinceUserCreation: number;
}

export interface CustomerReport {
  _id: string;
  customerId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  customerType: string;
  city: string;
  state: string;
  isActive: boolean;
  creditLimit: number;
  outstandingAmount: number;
  totalOrders: number;
  totalSpent: number;
  totalPaid: number;
  totalOutstanding: number;
  avgOrderValue: number;
  lastOrderDate: string;
  firstOrderDate: string;
  daysSinceLastOrder: number;
  pendingOrders: number;
  completedOrders: number;
  lifetimeValue: number;
}

export interface InactiveCustomer {
  _id: string;
  customerId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  customerType: string;
  city: string;
  state: string;
  lastOrderDate: string | null;
  lastOrderNumber: string | null;
  lastOrderAmount: number;
  daysSinceLastOrder: number | null;
  totalOrders: number;
  totalOrderValue: number;
  outstandingAmount: number;
}

export interface SalesExecutiveReportResponse {
  summary: {
    totalExecutives: number;
    totalOrdersAll: number;
    totalRevenueAll: number;
    totalOutstandingAll: number;
    avgOrderValueAll: number;
  };
  reports: SalesExecutiveReport[];
  dateRange: {
    startDate: string;
    endDate: string;
  } | null;
}

export interface CustomerReportResponse {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalRevenueAll: number;
    totalOutstandingAll: number;
    avgCustomerValue: number;
  };
  reports: CustomerReport[];
  dateRange: {
    startDate: string;
    endDate: string;
  } | null;
  filters: {
    inactiveDays?: number;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface InactiveCustomersResponse {
  days: number;
  count: number;
  customers: InactiveCustomer[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Get Sales Executive Reports
export const getSalesExecutiveReports = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  sortBy?: string;
  sortOrder?: string;
  department?: string;
  godownId?: string;
  type?: string;
}): Promise<SalesExecutiveReportResponse> => {
  const response = await axiosInstance.get<ApiResponse<SalesExecutiveReportResponse>>(
    '/api/reports/sales-executives',
    { params }
  );
  return response.data.data;
};

// Get Customer Reports
export const getCustomerReports = async (params?: {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: string;
  inactiveDays?: number;
  page?: number;
  limit?: number;
  godownId?: string;
}): Promise<CustomerReportResponse> => {
  const response = await axiosInstance.get<ApiResponse<CustomerReportResponse>>(
    '/api/reports/customers',
    { params }
  );
  return response.data.data;
};

// Get Inactive Customers
export const getInactiveCustomers = async (days: number = 7, godownId?: string, page?: number, limit?: number): Promise<InactiveCustomersResponse> => {
  const params: any = { days };
  if (godownId) {
    params.godownId = godownId;
  }
  if (page) {
    params.page = page;
  }
  if (limit) {
    params.limit = limit;
  }
  const response = await axiosInstance.get<ApiResponse<InactiveCustomersResponse>>(
    '/api/reports/customers/inactive',
    { params }
  );
  return response.data.data;
};

// Get Executive Performance Detail
export const getExecutivePerformanceDetail = async (
  userId: string,
  params?: { startDate?: string; endDate?: string; type?: string }
) => {
  const response = await axiosInstance.get<ApiResponse<any>>(
    `/api/reports/sales-executives/${userId}`,
    { params }
  );
  return response.data.data;
};

// Get Customer Purchase Detail
export const getCustomerPurchaseDetail = async (
  customerId: string,
  params?: { startDate?: string; endDate?: string }
) => {
  const response = await axiosInstance.get<ApiResponse<any>>(
    `/api/reports/customers/${customerId}`,
    { params }
  );
  return response.data.data;
};

// Godown-wise Sales Reports
export const getGodownSalesReports = async (params?: {
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}) => {
  const response = await axiosInstance.get<ApiResponse<any>>(
    '/api/reports/godowns',
    { params }
  );
  return response.data.data;
};

// Export Sales Executive Reports to Excel
export const exportSalesExecutiveReportsToExcel = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  sortBy?: string;
  sortOrder?: string;
  department?: string;
  godownId?: string;
  type?: string;
  roleIds?: string[];
}): Promise<void> => {
  const response = await axiosInstance.get(
    '/api/reports/sales-executives/export/excel',
    { 
      params,
      responseType: 'blob' // Important for file download
    }
  );
  
  // Create a blob from the response
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = `sales-executive-${params?.type === 'visit' ? 'visits' : 'orders'}-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

