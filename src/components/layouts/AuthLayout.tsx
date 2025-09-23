import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../config/api';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white bg-opacity-10 rounded-full -translate-y-40 translate-x-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white bg-opacity-10 rounded-full translate-y-40 -translate-x-40" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold text-white">D</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{APP_CONFIG.COMPANY_NAME}</h1>
                <p className="text-blue-100 text-sm">Point of Sale System</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Manage Your Business with Confidence
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Streamline operations, track inventory, manage users, and grow your wheat flour business with our comprehensive POS solution.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                'Real-time Inventory Management',
                'Multi-location Godown Support',
                'Advanced User Permissions',
                'Comprehensive Reporting',
                'Mobile-First Design'
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full" />
                  <span className="text-blue-100">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom info */}
          <div className="mt-auto">
            <p className="text-blue-200 text-sm">
              © 2024 {APP_CONFIG.COMPANY_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-white">D</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900">{APP_CONFIG.COMPANY_NAME}</h1>
                <p className="text-gray-600 text-sm">POS System</p>
              </div>
            </div>
          </div>

          {/* Auth form outlet */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
