// API Configuration
export const API_CONFIG = {
  // BASE_URL:
    // import.meta.env.VITE_API_URL || "https://dullet.sensationsolutions.in",
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
    CHANGE_PASSWORD: "/api/auth/change-password",
    REFRESH_TOKEN: "/api/auth/refresh-token",

    // User endpoints
    USERS: "/api/users",
    USER_BY_ID: (id: string) => `/api/users/${id}`,
    ACTIVATE_USER: (id: string) => `/api/users/${id}/activate`,
    DEACTIVATE_USER: (id: string) => `/api/users/${id}/deactivate`,

    // Role endpoints
    ROLES: "/api/roles",
    ROLE_BY_ID: (id: string) => `/api/roles/${id}`,
    ROLE_PERMISSIONS: (id: string) => `/api/roles/${id}/permissions`,
    ACTIVATE_ROLE: (id: string) => `/api/roles/${id}/activate`,
    AVAILABLE_PERMISSIONS: "/api/roles/permissions/available",

    // Customer endpoints
    CUSTOMERS: "/api/customers",
    CUSTOMER_BY_ID: (id: string) => `/api/customers/${id}`,
    ACTIVATE_CUSTOMER: (id: string) => `/api/customers/${id}/activate`,
    CUSTOMER_STATS: "/api/customers/stats/summary",

    // Order endpoints
    ORDERS: "/api/orders",
    ORDER_BY_ID: (id: string) => `/api/orders/${id}`,
    ORDER_APPROVE: (id: string) => `/api/orders/${id}/approve`,
    ORDER_REJECT: (id: string) => `/api/orders/${id}/reject`,
    ORDER_ASSIGN_DRIVER: (id: string) => `/api/orders/${id}/assign-driver`,
    ORDER_UNASSIGN_DRIVER: (id: string) => `/api/orders/${id}/unassign-driver`,
    ORDER_OUT_FOR_DELIVERY: (id: string) =>
      `/api/orders/${id}/out-for-delivery`,
    ORDER_RECORD_DELIVERY: (id: string) => `/api/orders/${id}/record-delivery`,
    CUSTOMER_ORDER_HISTORY: (customerId: string) =>
      `/api/orders/customer/${customerId}/history`,
    ORDER_STATS: "/api/orders/stats/summary",
    // Visit endpoints
    CREATE_VISIT: "/api/orders/visits",
    VISITS: "/api/orders/visits",
    VISIT_BY_ID: (id: string) => `/api/orders/visits/${id}`,
    // Quick-order endpoints
    QUICK_PRODUCTS: "/api/orders/quick/products",
    QUICK_ORDER: "/api/orders/quick",

    // Godown endpoints
    GODOWNS: "/api/godowns",
    GODOWN_BY_ID: (id: string) => `/api/godowns/${id}`,

    // Inventory endpoints
    INVENTORY: "/api/inventory",
    INVENTORY_BY_ID: (id: string) => `/api/inventory/${id}`,
    INVENTORY_STATS: "/api/inventory/stats/summary",
    INVENTORY_BY_GODOWN: (godownId: string) =>
      `/api/inventory/godown/${godownId}`,

    // Attendance endpoints
    ATTENDANCE: "/api/attendance",
    ATTENDANCE_BY_ID: (id: string) => `/api/attendance/${id}`,
    ATTENDANCE_STATS: "/api/attendance/stats",
    ATTENDANCE_TODAY: "/api/attendance/today",
    ATTENDANCE_TODAY_BY_USER: (userId: string) =>
      `/api/attendance/today/${userId}`,
    ATTENDANCE_CHECK_IN: "/api/attendance/check-in",
    ATTENDANCE_CHECK_OUT: "/api/attendance/check-out",
    ATTENDANCE_CHECK_OUT_BY_ID: (id: string) =>
      `/api/attendance/${id}/check-out`,

    // Transit endpoints
    TRANSITS: "/api/transits",
    TRANSIT_BY_ID: (id: string) => `/api/transits/${id}`,
    TRANSIT_BY_TRANSIT_ID: (transitId: string) => `/api/transits/transit/${transitId}`,
    TRANSIT_UPDATE_STATUS: (id: string) => `/api/transits/${id}/status`,
    TRANSIT_ASSIGN_DRIVER: (id: string) => `/api/transits/${id}/assign-driver`,
    TRANSIT_STATS: "/api/transits/stats",
    TRANSIT_BY_LOCATION: (location: string) => `/api/transits/location/${location}`,
    TRANSIT_BULK_UPDATE_STATUS: "/api/transits/bulk/status",
    TRANSIT_PENDING: "/api/transits/pending",
    TRANSIT_MY_TRANSITS: "/api/transits/my-transits",
    TRANSIT_AUDIT_TRAIL: (id: string) => `/api/transits/${id}/audit-trail`,

    // Production endpoints
    PRODUCTIONS: "/api/productions",
    PRODUCTION_BY_ID: (id: string) => `/api/productions/${id}`,
    PRODUCTION_BY_BATCH_ID: (batchId: string) => `/api/productions/batch/${batchId}`,
    PRODUCTION_STATS: "/api/productions/stats",
    PRODUCTION_BY_LOCATION: (location: string) => `/api/productions/location/${location}`,
    PRODUCTION_SUMMARY: "/api/productions/summary",
    PRODUCTION_AUDIT_TRAIL: (id: string) => `/api/productions/${id}/audit-trail`,

    // Transaction endpoints
    TRANSACTIONS: "/api/transactions",
    TRANSACTION_BY_ID: (id: string) => `/api/transactions/${id}`,
    TRANSACTION_ALLOCATE_CUSTOMER: "/api/transactions/allocate/customer",

    // System endpoints
    HEALTH: "/api/health",
  },
};

// Request/Response configurations
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// File upload configurations
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ACCEPTED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  ACCEPTED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

// Pagination configurations
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// App configurations
export const APP_CONFIG = {
  APP_NAME: "Dullet Industries POS",
  LOGO_URL:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl-e2zS5iPvDMHvbCfA9aCvYYlSuBukcqElS0ewrn-wKVY9b53",
  APP_VERSION: "1.0.0",
  COMPANY_NAME: "Dullet Industries",
  COMPANY_WEBSITE: "https://www.dulletindustries.in",
  SESSION_TIMEOUT: 10 * 60 * 60 * 1000, // 10 hours
  AUTO_SAVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
};
