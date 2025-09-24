import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';

// Layouts
import AuthLayout from '../components/layouts/AuthLayout';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));

// User Management Pages
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const CreateUserPage = lazy(() => import('../pages/users/CreateUserPage'));
const EditUserPage = lazy(() => import('../pages/users/EditUserPage'));
const UserDetailsPage = lazy(() => import('../pages/users/UserDetailsPage'));

// Role Management Pages
const RolesPage = lazy(() => import('../pages/roles/RolesPage'));
const CreateRolePage = lazy(() => import('../pages/roles/CreateRolePage'));
const EditRolePage = lazy(() => import('../pages/roles/EditRolePage'));
const RoleDetailsPage = lazy(() => import('../pages/roles/RoleDetailsPage'));

// Order Management Pages
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const CreateOrderPage = lazy(() => import('../pages/orders/CreateOrderPage'));

// Settings Pages
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));

// Error Pages
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('../pages/errors/UnauthorizedPage'));

export const router = createBrowserRouter([
  // Public routes (Authentication)
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },

  // Protected routes (Dashboard)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },

      // Profile
      {
        path: 'profile',
        element: <ProfilePage />,
      },

      // User Management
      {
        path: 'users',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="users.read">
                <UsersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute requiredPermission="users.create">
                <CreateUserPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="users.read">
                <UserDetailsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermission="users.update">
                <EditUserPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Role Management
      {
        path: 'roles',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="roles.read">
                <RolesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute requiredPermission="roles.create">
                <CreateRolePage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="roles.read">
                <RoleDetailsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermission="roles.update">
                <EditRolePage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Order Management
      {
        path: 'orders',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="orders.read">
                <OrdersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'new',
            element: (
              <ProtectedRoute requiredPermission="orders.create">
                <CreateOrderPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Settings
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredPermission="settings.manage">
            <SettingsPage />
          </ProtectedRoute>
        ),
      },

      // Error pages within dashboard
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
    ],
  },

  // Login redirect
  {
    path: '/login',
    element: <Navigate to="/auth/login" replace />,
  },

  // 404 page
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
