import { useEffect } from "react";
import { authService } from "../services/authService";
import apiService from "../services/api";

/**
 * Hook to sync authentication state across browser tabs.
 * It listens for auth-related changes in localStorage
 * and triggers login/logout updates accordingly.
 */
export const useSessionSync = (onAuthChange: (isAuthenticated: boolean) => void) => {
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key) return;

      const relevantKeys = ["auth_token", "user_data", "refresh_token", "login_timestamp"];
      if (!relevantKeys.includes(event.key)) return;

      apiService.getToken();

      // Handle logout in another tab
      if (event.key === "auth_token" && !event.newValue) {
        setTimeout(() => {
          const token = localStorage.getItem("auth_token");
          const userData = localStorage.getItem("user_data");
          const loginTimestamp = localStorage.getItem("login_timestamp");

          if (!token && (!userData || !loginTimestamp)) {
            console.log("Detected logout in another tab");
            authService.clearAuthData();
            onAuthChange(false);
          }
        }, 200);
        return;
      }

      // Handle login in another tab
      if (event.key === "auth_token" && !event.newValue && event.oldValue) {
        console.log("Detected login in another tab");
        setTimeout(() => onAuthChange(true), 100);
        return;
      }

      // Handle session refresh in another tab
      if (event.key === "login_timestamp" && event.newValue) {
        console.log("Session refreshed in another tab");
        // No need to trigger auth change, just acknowledge the refresh
         // Add a small delay to ensure all login-related storage operations are complete
        setTimeout(() => {
          onAuthChange(true);
        }, 100);
        return;
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [onAuthChange]);

  const refreshSession = () => authService.refreshSession();

  return { refreshSession };
};

export default useSessionSync;
