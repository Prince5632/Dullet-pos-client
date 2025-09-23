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
