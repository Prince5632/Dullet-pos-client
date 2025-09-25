import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

/**
 * Debug component to monitor session state and test persistent login
 * Remove this component in production
 */
const SessionDebug: React.FC = () => {
  const { isAuthenticated, user, refreshSession } = useAuth();
  const [sessionInfo, setSessionInfo] = useState({
    token: '',
    refreshToken: '',
    loginTimestamp: '',
    isSessionValid: false,
  });

  useEffect(() => {
    const updateSessionInfo = () => {
      setSessionInfo({
        token: localStorage.getItem('auth_token') || '',
        refreshToken: localStorage.getItem('refresh_token') || '',
        loginTimestamp: localStorage.getItem('login_timestamp') || '',
        isSessionValid: authService.isSessionValid(),
      });
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(parseInt(timestamp)).toLocaleString();
  };

  const getTimeRemaining = () => {
    const loginTimestamp = localStorage.getItem('login_timestamp');
    if (!loginTimestamp) return 'N/A';
    
    const loginTime = parseInt(loginTimestamp);
    const currentTime = Date.now();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const timeRemaining = sessionTimeout - (currentTime - loginTime);
    
    if (timeRemaining <= 0) return 'Expired';
    
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg max-w-sm">
        <h3 className="font-semibold text-red-800 mb-2">Session Debug (Not Authenticated)</h3>
        <div className="text-sm text-red-600">
          <p>User is not logged in</p>
          <p>Token: {sessionInfo.token ? 'Present' : 'None'}</p>
          <p>Refresh Token: {sessionInfo.refreshToken ? 'Present' : 'None'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold text-green-800 mb-2">Session Debug (Authenticated)</h3>
      <div className="text-sm text-green-700 space-y-1">
        <p><strong>User:</strong> {user?.firstName} {user?.lastName}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role?.name}</p>
        <p><strong>Login Time:</strong> {formatTimestamp(sessionInfo.loginTimestamp)}</p>
        <p><strong>Time Remaining:</strong> {getTimeRemaining()}</p>
        <p><strong>Session Valid:</strong> {sessionInfo.isSessionValid ? '✅' : '❌'}</p>
        <p><strong>Token:</strong> {sessionInfo.token ? '✅ Present' : '❌ Missing'}</p>
        <p><strong>Refresh Token:</strong> {sessionInfo.refreshToken ? '✅ Present' : '❌ Missing'}</p>
        
        <div className="mt-3 space-y-2">
          <button
            onClick={refreshSession}
            className="w-full bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
          >
            Refresh Session
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="w-full bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
          >
            Clear Storage & Reload
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionDebug;
