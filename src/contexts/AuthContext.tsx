import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginRequest } from '../types';
import { authService } from '../services/authService';
import { useSessionSync } from '../hooks/useSessionSync';
import { APP_CONFIG } from '../config/api';
import toast from 'react-hot-toast';

// Auth State
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context type
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: () => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasOrderManageAccess: () => boolean;
  getUserId: () => string | null;
  clearError: () => void;
  refreshSession: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Handle cross-tab authentication changes
  const handleAuthChange = useCallback(async (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      // User logged in in another tab, refresh our state
      try {
        dispatch({ type: 'AUTH_START' });
        const user = await authService.getProfile();
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch (error) {
        console.error('Failed to sync login from another tab:', error);
        dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to sync authentication' });
      }
    } else {
      // User logged out in another tab
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Use session sync hook for cross-tab communication
  const { refreshSession } = useSessionSync(handleAuthChange);

  // Initialize auth state on app load
  useEffect(() => {
    let mounted = true; // Flag to prevent state updates after unmount
    
    const initializeAuth = async () => {
      try {
        // Only initialize if we're still in loading state
        if (!state.isLoading) return;

        // Check if user has valid session
        if (authService.isAuthenticated()) {
          if (!mounted) return;
          dispatch({ type: 'AUTH_START' });
          try {
            const user = await authService.getProfile();
            if (!mounted) return;
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          } catch (error) {
            // If profile fetch fails, try to refresh token
            console.log('Profile fetch failed, attempting token refresh...');
            const refreshSuccess = await authService.attemptTokenRefresh();
            
            if (refreshSuccess && mounted) {
              const user = await authService.getProfile();
              if (!mounted) return;
              dispatch({ type: 'AUTH_SUCCESS', payload: user });
            } else {
              throw error;
            }
          }
        } else {
          // Check if we can restore session using refresh token
          const refreshSuccess = await authService.attemptTokenRefresh();
          
          if (refreshSuccess && mounted) {
            dispatch({ type: 'AUTH_START' });
            const user = await authService.getProfile();
            if (!mounted) return;
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          } else {
            // No existing session - this is normal, don't show error
            if (mounted) {
              dispatch({ type: 'LOGOUT' });
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.clearAuthData();
        // Don't show error message during initialization - just set to logged out state
        if (mounted) {
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    // Only run once on mount when initial loading state
    if (state.isLoading && !state.isAuthenticated) {
      initializeAuth();
    }

    return () => {
      mounted = false; // Cleanup flag
    };
  }, []); // Empty dependency array to run only once

  // Set up user activity tracking to refresh session
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let activityTimer: number;

    const handleUserActivity = () => {
      // Debounce activity tracking to avoid excessive calls
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        if (state.isAuthenticated) {
          refreshSession();
        }
      }, 30000); // Refresh session every 30 seconds of activity
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Initial activity registration
    handleUserActivity();

    // Cleanup
    return () => {
      clearTimeout(activityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [state.isAuthenticated, refreshSession]);


  // Login function
  const login = async (credentials: LoginRequest): Promise<void> => {
    console.log('[AuthContext] Login started');
    dispatch({ type: 'AUTH_START' });
    
    try {
      const loginResponse = await authService.login(credentials);
      console.log('[AuthContext] Login API success, user:', loginResponse.user.email);
      dispatch({ type: 'AUTH_SUCCESS', payload: loginResponse.user });
      console.log('[AuthContext] Auth state updated to SUCCESS');
      toast.success(`Welcome back, ${loginResponse.user.firstName}!`);
    } catch (error: any) {
      console.error('[AuthContext] Login failed:', error.message);
      const errorMessage = error.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error; // Re-throw to handle in component
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still dispatch logout even if API call fails
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  // Update profile
  const updateProfile = async (): Promise<void> => {
    try {
      const user = await authService.getProfile();
      dispatch({ type: 'UPDATE_USER', payload: user });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Change password
  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<void> => {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('New password and confirm password do not match');
    }

    try {
      await authService.changePassword(data);
      toast.success('Password changed successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to change password';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Permission check functions
  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return authService.hasAnyPermission(permissions);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return authService.hasAllPermissions(permissions);
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    const roleName = state.user?.role?.name;
    if (!roleName) return false;
    return roles.includes(roleName);
  };

  const hasOrderManageAccess = (): boolean => {
    if (!state.user) return false;
    return (
      hasPermission('orders.manage') ||
      hasRole('Manager') ||
      hasRole('Admin') ||
      hasRole('Super Admin')
    );
  };

  const getUserId = (): string | null => {
    return authService.getCurrentUserId();
  };

  // Clear error
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Session expiration warning logic
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const checkSessionExpiration = () => {
      const loginTimestamp = localStorage.getItem('login_timestamp');
      if (!loginTimestamp) return;

      const loginTime = parseInt(loginTimestamp);
      const currentTime = Date.now();
      const sessionTimeout = APP_CONFIG.SESSION_TIMEOUT;
      const warningTime = 5 * 60 * 1000; // 5 minutes before expiration
      
      const timeElapsed = currentTime - loginTime;
      const timeRemaining = sessionTimeout - timeElapsed;

      // If session has expired, logout automatically
      if (timeRemaining <= 0) {
        toast.error('Your session has expired. Please login again.');
        logout();
        return;
      }

      // If session is about to expire, show warning
      if (timeRemaining <= warningTime && timeRemaining > 0) {
        const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
        toast.error(
          `Your session will expire in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Please save your work.`,
          {
            duration: 10000, // Show for 10 seconds
            id: 'session-warning', // Prevent duplicate toasts
          }
        );
      }
    };

    // Check session expiration every minute
    const interval = setInterval(checkSessionExpiration, 60 * 1000);

    // Initial check
    checkSessionExpiration();

    return () => clearInterval(interval);
  }, [state.isAuthenticated, logout]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    updateProfile,
    changePassword,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasOrderManageAccess,
    getUserId,
    clearError,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
