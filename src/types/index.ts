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
    totalRecords?: number;
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
  department:
    | "Sales"
    | "Production"
    | "Management"
    | "Admin"
    | "Warehouse"
    | "Finance";
  position: string;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  lastLogin?: string;
  lastLoginIP?: string;
  createdAt: string;
  updatedAt: string;
  // Godown assignments
  primaryGodown?: Godown;
  accessibleGodowns?: Godown[];
  address?: UserAddress;
  aadhaarNumber?: string;
  panNumber?: string;
  documents?: UserDocument[];
}

export interface UserAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export type UserDocumentType = "aadhaar" | "pan" | "other";

export interface UserDocument {
  _id?: string;
  type: UserDocumentType;
  url: string;
  fileName?: string;
  label?: string;
  uploadedAt?: string;
  mimeType?: string;
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
  module:
    | "users"
    | "roles"
    | "orders"
    | "billing"
    | "stock"
    | "production"
    | "godowns"
    | "customers"
    | "employees"
    | "reports"
    | "settings";
  action: "create" | "read" | "update" | "delete" | "approve" | "manage";
  description: string;
  isActive: boolean;
}

// Godown Types
export interface Godown {
  _id: string;
  name: string;
  code?: string;
  location: { city: string; state: string; area?: string };
  allowedProducts?: string[];
  isActive: boolean;
}

// Attendance Types
export interface Attendance {
  _id: string;
  user: User;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInImage: string;
  checkOutImage?: string;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  godown?: Godown;
  status: "present" | "late" | "half_day" | "absent";
  workingHours: number;
  notes?: string;
  isAutoMarked: boolean;
  markedBy: User;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalAttendance: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  averageWorkingHours: number;
  attendanceRate: number;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  godownId?: string;
  status?: "present" | "late" | "half_day" | "absent";
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface MarkAttendanceForm {
  userId?: string;
  checkInImage?: File | string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  isAutoMarked?: boolean;
}

export interface CheckOutForm {
  checkOutImage?: File | string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// Auth Types
export interface LoginRequest {
  email?: string;
  identifier?: string; // username | email | phone
  password: string;
  faceImage?: File;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  session: {
    id: string;
    loginTime: string;
  };
  attendanceMarked?: boolean;
}

// Form Types
export interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
  department: User["department"];
  position: string;
  profilePhoto?: File;
  primaryGodownId?: string;
  accessibleGodownIds?: string[];
  address?: UserAddress;
  aadhaarNumber?: string;
  panNumber?: string;
  aadhaarDocument?: File;
  panDocument?: File;
  otherDocuments?: File[];
  otherDocumentsMeta?: { label?: string; type: UserDocumentType }[];
  username?: string;
}

export interface UpdateUserForm extends Partial<CreateUserForm> {
  isActive?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
  addressCountry?: string;
  removeDocumentIds?: string[];
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
  email?: string;
  phone: string;
  alternatePhone?: string;
  location?: string;
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
  customerType: "Retailer" | "Distributor" | "Wholesaler";
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
  email?: string;
  phone: string;
  alternatePhone?: string;
  location?: string;
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
  customerType: "Retailer" | "Distributor" | "Wholesaler";
  notes?: string;
}

export interface UpdateCustomerForm extends Partial<CreateCustomerForm> {}

// Order Types
export interface OrderItem {
  _id?: string;
  productName: string;
  grade?: string;
  quantity: number;
  unit: "KG" | "Quintal" | "Ton" | "Bags";
  ratePerUnit: number;
  totalAmount: number;
  packaging:
    | "Standard"
    | "Custom"
    | "5kg Bags"
    | "10kg Bags"
    | "25kg Bags"
    | "50kg Bags"
    | "40kg Bag"
    | "Loose";
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
  status:
    | "pending"
    | "approved"
    | "processing"
    | "ready"
    | "dispatched"
    | "driver_assigned"
    | "out_for_delivery"
    | "delivered"
    | "completed"
    | "cancelled"
    | "rejected";
  priority: "low" | "normal" | "high" | "urgent";
  orderDate: string;
  requiredDate?: string;
  managerApproval?: {
    approvedBy?: User;
    approvedAt?: string;
    notes?: string;
  };
  driverAssignment?: {
    driver?: User;
    assignedAt?: string;
    pickupAt?: string;
    deliveryAt?: string;
    pickupLocation?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    deliveryLocation?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    driverNotes?: string;
    vehicleNumber?: string;
  };
  signatures?: {
    pickupProof?: string;
    driver?: string;
    receiver?: string;
  };
  settlements?: Array<{
    amountCollected?: number;
    notes?: string;
    recordedBy?: User;
    recordedAt?: string;
  }>;
  paymentTerms: "Cash" | "Credit" | "Advance";
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
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
  godown?: Godown;
  remainingAmount?: number;
  orderAge?: number;
  capturedImage?: string;
  captureLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export interface CreateOrderForm {
  customer: string;
  items: OrderItem[];
  godown?: string;
  discountPercentage?: number;
  discount?: number;
  taxAmount?: number;
  paymentTerms: "Cash" | "Credit" | "Advance";
  priority?: "low" | "normal" | "high" | "urgent";
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
  paymentStatus?: Order["paymentStatus"];
  capturedImage?: string;
  captureLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  items: OrderItem[];
}

export interface OrderStatusUpdate {
  status: Order["status"];
  notes?: string;
}

// Quick Order Types
export interface QuickProduct {
  key: string;
  name: string;
  pricePerKg: number;
  bagSizeKg?: number;
  defaultPackaging?:
    | "Standard"
    | "Custom"
    | "5kg Bags"
    | "10kg Bags"
    | "25kg Bags"
    | "50kg Bags"
    | "Loose"
    | "40kg Bags"
    | "40kg Bag";
  category?: string;
  cityTokens?: string[];
}

export interface QuickOrderItemInput {
  productKey: string;
  quantityKg?: number;
  bags?: number;
  bagPieces?: number;
  packaging?: OrderItem["packaging"];
}

export interface CreateQuickOrderForm {
  customer: string;
  items: QuickOrderItemInput[];
  paymentTerms?: Order["paymentTerms"];
  priority?: Order["priority"];
  notes?: string;
  deliveryInstructions?: string;
  paidAmount?: number;
  paymentStatus?: Order["paymentStatus"];
  godown?: string;
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
