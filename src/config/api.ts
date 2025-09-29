// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    
    // User endpoints
    USERS: '/api/users',
    USER_BY_ID: (id: string) => `/api/users/${id}`,
    ACTIVATE_USER: (id: string) => `/api/users/${id}/activate`,
    
    // Role endpoints
    ROLES: '/api/roles',
    ROLE_BY_ID: (id: string) => `/api/roles/${id}`,
    ROLE_PERMISSIONS: (id: string) => `/api/roles/${id}/permissions`,
    ACTIVATE_ROLE: (id: string) => `/api/roles/${id}/activate`,
    AVAILABLE_PERMISSIONS: '/api/roles/permissions/available',
    
    // Customer endpoints
    CUSTOMERS: '/api/customers',
    CUSTOMER_BY_ID: (id: string) => `/api/customers/${id}`,
    ACTIVATE_CUSTOMER: (id: string) => `/api/customers/${id}/activate`,
    CUSTOMER_STATS: '/api/customers/stats/summary',
    
    // Order endpoints
    ORDERS: '/api/orders',
    ORDER_BY_ID: (id: string) => `/api/orders/${id}`,
    ORDER_STATUS: (id: string) => `/api/orders/${id}/status`,
    CUSTOMER_ORDER_HISTORY: (customerId: string) => `/api/orders/customer/${customerId}/history`,
    ORDER_STATS: '/api/orders/stats/summary',
    // Quick-order endpoints
    QUICK_PRODUCTS: '/api/orders/quick/products',
    QUICK_ORDER: '/api/orders/quick',
    
    // Godown endpoints
    GODOWNS: '/api/godowns',
    GODOWN_BY_ID: (id: string) => `/api/godowns/${id}`,
    
    // System endpoints
    HEALTH: '/api/health'
  }
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
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Pagination configurations
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// App configurations
export const APP_CONFIG = {
  APP_NAME: 'Dullet Industries POS',
  LOGO_URL: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl-e2zS5iPvDMHvbCfA9aCvYYlSuBukcqElS0ewrn-wKVY9b53',
  APP_VERSION: '1.0.0',
  COMPANY_NAME: 'Dullet Industries',
  COMPANY_WEBSITE: 'https://www.dulletindustries.in',
  SESSION_TIMEOUT: 10 * 60 * 60 * 1000, // 10 hours
  AUTO_SAVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
};
