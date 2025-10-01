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
}

export interface InactiveCustomersResponse {
  days: number;
  count: number;
  customers: InactiveCustomer[];
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
}): Promise<CustomerReportResponse> => {
  const response = await axiosInstance.get<ApiResponse<CustomerReportResponse>>(
    '/api/reports/customers',
    { params }
  );
  return response.data.data;
};

// Get Inactive Customers
export const getInactiveCustomers = async (days: number = 7): Promise<InactiveCustomersResponse> => {
  const response = await axiosInstance.get<ApiResponse<InactiveCustomersResponse>>(
    '/api/reports/customers/inactive',
    { params: { days } }
  );
  return response.data.data;
};

// Get Executive Performance Detail
export const getExecutivePerformanceDetail = async (
  userId: string,
  params?: { startDate?: string; endDate?: string }
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

