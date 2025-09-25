// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginationResponse<T> extends ApiResponse<T> {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers?: number;
    totalRoles?: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  role: Role;
  department: 'Sales' | 'Production' | 'Management' | 'Admin' | 'Warehouse' | 'Finance';
  position: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  lastLogin?: string;
  lastLoginIP?: string;
  createdAt: string;
  updatedAt: string;
}

// Role Types
export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Permission Types
export interface Permission {
  _id: string;
  name: string;
  module: 'users' | 'roles' | 'orders' | 'billing' | 'stock' | 'production' | 'godowns' | 'customers' | 'employees' | 'reports' | 'settings';
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'manage';
  description: string;
  isActive: boolean;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  faceImage?: File;
}

export interface LoginResponse {
  user: User;
  token: string;
  session: {
    id: string;
    loginTime: string;
  };
}

// Form Types
export interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
  department: User['department'];
  position: string;
  profilePhoto?: File;
}

export interface UpdateUserForm extends Partial<CreateUserForm> {
  isActive?: boolean;
}

export interface CreateRoleForm {
  name: string;
  description: string;
  permissions: string[];
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Customer Types
export interface Customer {
  _id: string;
  customerId: string;
  businessName: string;
  contactPersonName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstNumber?: string;
  panNumber?: string;
  creditLimit: number;
  creditDays: number;
  outstandingAmount: number;
  isActive: boolean;
  customerType: 'Retailer' | 'Distributor' | 'Wholesaler';
  lastOrderDate?: string;
  totalOrders: number;
  totalOrderValue: number;
  notes: string;
  createdBy: User;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  fullAddress?: string;
  creditUtilization?: number;
}

export interface CreateCustomerForm {
  businessName: string;
  contactPersonName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  gstNumber?: string;
  panNumber?: string;
  creditLimit?: number;
  creditDays?: number;
  customerType: 'Retailer' | 'Distributor' | 'Wholesaler';
  notes?: string;
}

export interface UpdateCustomerForm extends Partial<CreateCustomerForm> {}

// Order Types
export interface OrderItem {
  _id?: string;
  productName: string;
  grade?: string;
  quantity: number;
  unit: 'KG' | 'Quintal' | 'Ton' | 'Bags';
  ratePerUnit: number;
  totalAmount: number;
  packaging: 'Standard' | 'Custom' | '5kg Bags' | '10kg Bags' | '25kg Bags' | '50kg Bags' | 'Loose';
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'ready' | 'dispatched' | 'delivered' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderDate: string;
  requiredDate?: string;
  approvedDate?: string;
  dispatchDate?: string;
  deliveryDate?: string;
  paymentTerms: 'Cash' | 'Credit' | 'Advance';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paidAmount: number;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  deliveryInstructions: string;
  notes: string;
  internalNotes: string;
  createdBy: User;
  approvedBy?: User;
  updatedBy?: User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  remainingAmount?: number;
  orderAge?: number;
}

export interface CreateOrderForm {
  customer: string;
  items: OrderItem[];
  discountPercentage?: number;
  discount?: number;
  taxAmount?: number;
  paymentTerms: 'Cash' | 'Credit' | 'Advance';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requiredDate?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  deliveryInstructions?: string;
  notes?: string;
}

export interface UpdateOrderForm extends Partial<CreateOrderForm> {
  paidAmount?: number;
  paymentStatus?: Order['paymentStatus'];
}

export interface OrderStatusUpdate {
  status: Order['status'];
  notes?: string;
}

// Quick Order Types
export interface QuickProduct {
  key: string;
  name: string;
  pricePerKg: number;
  bagSizeKg?: number;
  defaultPackaging?: 'Standard' | 'Custom' | '5kg Bags' | '10kg Bags' | '25kg Bags' | '50kg Bags' | 'Loose';
  category?: string;
}

export interface QuickOrderItemInput {
  productKey: string;
  quantityKg?: number;
  bags?: number;
  packaging?: OrderItem['packaging'];
}

export interface CreateQuickOrderForm {
  customer: string;
  items: QuickOrderItemInput[];
  paymentTerms?: Order['paymentTerms'];
  priority?: Order['priority'];
  notes?: string;
  deliveryInstructions?: string;
  paidAmount?: number;
  paymentStatus?: Order['paymentStatus'];
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
  children?: NavItem[];
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

// Filter Types
export interface FilterOption {
  label: string;
  value: string;
}

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
  todayLogins: number;
  activeSessionsCount: number;
}

// Chart Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}
