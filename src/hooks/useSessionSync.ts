import { useEffect } from 'react';
import { authService } from '../services/authService';

/**
 * Hook to synchronize authentication state across browser tabs
 * Listens for localStorage changes and updates auth state accordingly
 */
export const useSessionSync = (onAuthChange: (isAuthenticated: boolean) => void) => {
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle auth-related storage changes
      if (!event.key || !['auth_token', 'user_data', 'refresh_token', 'login_timestamp'].includes(event.key)) {
        return;
      }

      // Check if user was logged out in another tab
      if (event.key === 'auth_token' && !event.newValue) {
        console.log('User logged out in another tab');
        authService.clearAuthData();
        onAuthChange(false);
        return;
      }

      // Check if user logged in in another tab
      if (event.key === 'auth_token' && event.newValue && !event.oldValue) {
        console.log('User logged in in another tab');
        onAuthChange(true);
        return;
      }

      // Check if session was refreshed in another tab
      if (event.key === 'login_timestamp' && event.newValue) {
        console.log('Session refreshed in another tab');
        // No need to trigger auth change, just acknowledge the refresh
        return;
      }
    };

    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [onAuthChange]);

  // Function to refresh session timestamp (call on user activity)
  const refreshSession = () => {
    authService.refreshSession();
  };

  return { refreshSession };
};

export default useSessionSync;
