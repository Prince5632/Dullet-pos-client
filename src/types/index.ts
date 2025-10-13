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
  orderCount?: number;
  visitCount?: number;
  inventoryCount?: number;
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
  assignedGodownId?: string;
  // Virtual fields
  fullAddress?: string;
  creditUtilization?: number;
  netBalance?: number;
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
  assignedGodownId?: string;
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
    | "40kg Bags"
    | "Loose";
  isBagSelection?: boolean;
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
  paymentTerms: "Cash" | "Credit" | "Advance" | "Cheque" | "Online";
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
  isTaxable?: boolean;
  taxPercentage?: number;
  paymentTerms: "Cash" | "Credit" | "Advance" | "Cheque" | "Online";
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

// Inventory Types
export interface Inventory {
  _id: string;
  stockId: string;
  inventoryType: "New Stock" | "Stock Sold" | "Damaged / Return";
  dateOfStock: string;
  quantity: number;
  unit: "Kg" | "Quintal";
  godown?: Godown;
  pricePerKg?: number;
  additionalNotes?: string;
  loggedBy: User;
  createdAt: string;
  updatedAt?: string;
  quantityWithUnit?: string;
}

export interface CreateInventoryForm {
  inventoryType: "New Stock" | "Stock Sold" | "Damaged / Return";
  dateOfStock: string;
  quantity: number;
  unit: "Kg" | "Quintal";
  godown?: string;
  pricePerKg?: number;
  additionalNotes?: string;
}

export interface UpdateInventoryForm extends Partial<CreateInventoryForm> {}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  inventoryType?: string;
  godown?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  loggedBy?: string;
}

export interface InventoryStats {
  totalStock: number;
  totalQuantity: number;
  averagePrice: number;
  newStock: number;
  stockSold: number;
  damagedReturns: number;
}

// Table Column Types
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

// Transit types
export interface Transit {
  _id: string;
  transitId: string;
  fromLocation: string;
  toLocation:
    | {
        _id: string;
        name: string;
        location: {
          city: string;
          state: string;
          area?: string;
        };
      }
    | string;
  dateOfDispatch: string;
  expectedArrivalDate?: string;
  vehicleNumber: string;
  vehicleType?: "Truck" | "Mini Truck" | "Van" | "Other";
  driverId?:
    | {
        _id: string;
        firstName: string;
        lastName?: string;
        email: string;
        phone?: string;
      }
    | string;
  assignedTo?:
    | {
        _id: string;
        firstName: string;
        lastName?: string;
        email: string;
      }
    | string;
  partiallyReceivedBy?:
    | {
        _id: string;
        firstName: string;
        lastName?: string;
        email: string;
      }
    | string;
  receivedBy?:
    | {
        _id: string;
        firstName: string;
        lastName?: string;
        email: string;
      }
    | string;
  productDetails: ProductDetail[];
  transporterName?: string;
  remarks?: string;
  attachments?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    base64Data: string;
    uploadedAt: string;
  }[];
  status:
    | "New"
    | "In Transit"
    | "Received"
    | "Partially Received"
    | "Cancelled";
  statusHistory?: {
    status: string;
    notes?: string;
    changedBy: string | {
      _id: string;
      firstName: string;
      lastName?: string;
      email: string;
    };
    changedAt: string;
  }[];
  createdBy:
    | {
        _id: string;
        firstName: string;
        lastName?: string;
        email: string;
      }
    | string;
  createdAt: string;
  updatedAt: string;
}

export interface TransitItem {
  productName: string;
  quantity: number;
  unit: string;
  productDetails?: string;
}

export interface TransitVehicle {
  vehicleNumber: string;
  transporterName?: string;
}

export interface TransitStatusHistory {
  _id: string;
  status: string;
  timestamp: string;
  updatedBy: string;
  notes?: string;
}

export interface TransitLocation {
  fromLocation: string;
  toLocation: string;
}

export interface ProductDetail {
  productName: string;
  quantity: number;
  unit: string;
  additionalNote?: string;
}

export interface CreateTransitForm {
  productDetails: ProductDetail[];
  fromLocation: string;
  toLocation: string;
  dateOfDispatch: string;
  expectedArrivalDate?: string;
  vehicleNumber: string;
  vehicleType?: string;
  driverId?: string;
  assignedTo?: string;
  transporterName?: string;
  remarks?: string;
  attachments?: File[];
}

export interface UpdateTransitForm {
  productDetails?: ProductDetail[];
  fromLocation?: string;
  toLocation?: string;
  dateOfDispatch?: string;
  expectedArrivalDate?: string;
  vehicleNumber?: string;
  vehicleType?: "Truck" | "Mini Truck" | "Van" | "Other";
  driverId?: string;
  assignedTo?: string;
  transporterName?: string;
  remarks?: string;
  attachments?: File[];
  removedAttachments?: string[];
  status?: "New" | "In Transit" | "Received" | "Partially Received" | "Cancelled";
}

export interface TransitStatusUpdate {
  status:
    | "New"
    | "In Transit"
    | "Received"
    | "Partially Received"
    | "Cancelled";
  remarks?: string;
  notes?: string;
}

export interface TransitListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  driverId?: string;
  assignedTo?: string;
  fromLocation?: string;
  toLocation?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TransitStats {
  total: number;
  new: number;
  inTransit: number;
  received: number;
  partiallyReceived: number;
  cancelled: number;
}

// Transaction Types
export interface Transaction {
  _id: string;
  transactionId: string;
  transactionMode: 'Cash' | 'Credit' | 'Cheque' | 'Online';
  transactionForModel: 'Order' | 'Customer';
  transactionFor: string | { _id: string; orderNumber?: string; customerId?: string; businessName?: string } | Array<string | { _id: string; orderNumber?: string; customerId?: string; businessName?: string }>;
  amountPaid: number;
  customer: {
    _id: string;
    customerId: string;
    businessName: string;
    contactPersonName: string;
  };
  order?: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
  };
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  transactionMode?: string;
  transactionForModel?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Production Types
export interface OutputDetail {
  itemName: 'Atta' | 'Chokar';
  productQty: number;
  productUnit: 'KG' | 'Quintal' | 'Ton' | 'Bags' | '5Kg Bags' | '40Kg Bags';
  notes?: string;
}

export interface ProductionAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  base64Data: string;
  uploadedAt: string;
}

export interface Production {
  _id: string;
  batchId: string;
  productionDate: string;
  status: 'In Production' | 'Finished';
  shift: 'Morning' | 'Afternoon' | 'Night';
  location: string;
  machine: string;
  operator: string; // Changed from User reference to string
  inputType: string;
  inputQty: number;
  inputUnit: 'KG' | 'Quintal' | 'Ton';
  outputDetails: OutputDetail[];
  attachments?: ProductionAttachment[];
  remarks?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  totalOutputQty?: number;
  conversionEfficiency?: number;
}

export interface ProductionStats {
  totalProductions: number;
  totalInputQty: number;
  totalOutputQty: number;
  averageEfficiency: number;
  productionsByShift: {
    Day: number;
    Night: number;
  };
  productionsByLocation: {
    [key: string]: number;
  };
  recentProductions: Production[];
  // Enhanced stats for atta/chokar breakdown
  totalAttaProduction?: number;
  totalChokarProduction?: number;
  averageAttaProduction?: number;
  productionByUnit?: {
    [unit: string]: {
      totalQty: number;
      attaQty: number;
      chokarQty: number;
    };
  };
}

export interface CreateProductionForm {
  productionDate: string;
  status: 'In Production' | 'Finished';
  shift: 'Morning' | 'Afternoon' | 'Night';
  location: string;
  machine: string;
  operator: string; // Changed from User reference to string
  inputType: string;
  inputQty: number;
  inputUnit: 'KG' | 'Quintal' | 'Ton';
  outputDetails: OutputDetail[];
  attachments?: File[];
  remarks?: string;
}

export interface UpdateProductionForm extends CreateProductionForm {
  removedAttachments?: string[];
}

export interface ProductionListParams {
  page?: number;
  limit?: number;
  search?: string;
  shift?: string;
  location?: string;
  operator?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Table Types (moved to avoid duplication)
