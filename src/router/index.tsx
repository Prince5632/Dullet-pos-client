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
const VisitsPage = lazy(() => import('../pages/orders/VisitsPage'));
const QuickOrderPage = lazy(() => import('../pages/orders/QuickOrderPage'));
const OrderApprovalPage = lazy(() => import('../pages/orders/OrderApprovalPage'));
const OrderDetailsPage = lazy(() => import('../pages/orders/OrderDetailsPage'));
const EditOrderPage = lazy(() => import('../pages/orders/EditOrderPage'));
const CreateVisitPage = lazy(() => import('../pages/orders/CreateVisitPage'));
const VisitDetailsPage = lazy(() => import('../pages/orders/VisitDetailsPage'));
const EditVisitPage = lazy(() => import('../pages/orders/EditVisitPage'));

// Customer Management Pages
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage'));
const CreateCustomerPage = lazy(() => import('../pages/customers/CreateCustomerPage.tsx'));
const EditCustomerPage = lazy(() => import('../pages/customers/EditCustomerPage.tsx'));
const CustomerDetailsPage = lazy(() => import('../pages/customers/CustomerDetailsPage.tsx'));

// Attendance Management Pages
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage'));
const AttendanceDetailsPage = lazy(() => import('../pages/attendance/AttendanceDetailsPage'));

// Inventory Management Pages
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const AddInventoryPage = lazy(() => import('../pages/inventory/AddInventoryPage'));
const EditInventoryPage = lazy(() => import('../pages/inventory/EditInventoryPage'));
const ViewInventoryPage = lazy(() => import('../pages/inventory/ViewInventoryPage'));

// Report Pages
const SalesExecutiveReportsPage = lazy(() => import('../pages/reports/SalesExecutiveReportsPage'));
const CustomerReportsPage = lazy(() => import('../pages/reports/CustomerReportsPage'));
const GodownSalesReportsPage = lazy(() => import('../pages/reports/GodownSalesReportsPage'));
const SalesExecutiveDetailPage = lazy(() => import('../pages/reports/SalesExecutiveDetailPage'));
const PerformanceDetailPage = lazy(() => import('../pages/reports/PerformanceDetailPage'));
const CustomerDetailPage = lazy(() => import('../pages/reports/CustomerDetailsPage.tsx'));
const BillingReportsPage = lazy(() => import('../pages/reports/BillingReportsPage'));
const BillingDetailPage = lazy(() => import('../pages/reports/BillingDetailsPage'));
const PerformanceReportsPage = lazy(() => import('../pages/reports/PerformanceReportsPage'));

// Delivery Pages
const DeliveryInvoicePreview = lazy(() => import('../pages/delivery/DeliveryInvoicePreview'));

// Transit Management Pages
const TransitsPage = lazy(() => import('../pages/transits/TransitsPage'));
const CreateTransitPage = lazy(() => import('../pages/transits/CreateTransitPage'));
const ViewTransitPage = lazy(() => import('../pages/transits/ViewTransitPage'));
const EditTransitPage = lazy(() => import('../pages/transits/EditTransitPage'));

// Production Management Pages
const ProductionsPage = lazy(() => import('../pages/productions/ProductionsPage'));
const CreateProductionPage = lazy(() => import('../pages/productions/CreateProductionPage'));
const ViewProductionPage = lazy(() => import('../pages/productions/ViewProductionPage'));
const EditProductionPage = lazy(() => import('../pages/productions/EditProductionPage'));

// Settings Pages


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

      // Customer Management
      {
        path: 'customers',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="customers.read">
                <CustomersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute requiredPermission="customers.create">
                <CreateCustomerPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="customers.read">
                <CustomerDetailsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermission="customers.update">
                <EditCustomerPage />
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
            path: 'approval',
            element: (
              <ProtectedRoute requiredPermission="orders.approve">
                <OrderApprovalPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'new',
            element: (
              <ProtectedRoute requiredPermission="orders.create">
                <QuickOrderPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':orderId/edit',
            element: (
              <ProtectedRoute requiredPermission="orders.update">
                <EditOrderPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':orderId',
            element: (
              <ProtectedRoute requiredPermission="orders.read">
                <OrderDetailsPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Visits Management (separate from Orders)
      {
        path: 'visits',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="orders.read">
                <VisitsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'new',
            element: (
              <ProtectedRoute requiredPermission="orders.create">
                <CreateVisitPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':visitId',
            element: (
              <ProtectedRoute requiredPermission="orders.read">
                <VisitDetailsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':visitId/edit',
            element: (
              <ProtectedRoute requiredPermission="orders.update">
                <EditVisitPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Attendance Management
      {
        path: 'attendance',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="attendance.read">
                <AttendancePage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="attendance.read">
                <AttendanceDetailsPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Inventory Management
      {
        path: 'inventory',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="stock.read">
                <InventoryPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'add',
            element: (
              <ProtectedRoute requiredPermission="stock.create">
                <AddInventoryPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'edit/:id',
            element: (
              <ProtectedRoute requiredPermission="stock.update">
                <EditInventoryPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="stock.read">
                <ViewInventoryPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Reports
      {
        path: 'reports',
        children: [
          {
            path: 'sales-executives',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <SalesExecutiveReportsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'godowns',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <GodownSalesReportsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'sales-executives/:userId',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <SalesExecutiveDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'performance/:userId',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <PerformanceDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'customers',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <CustomerReportsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'customers/:customerId',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <CustomerDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'billing',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <BillingReportsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'billing/:customerId',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <BillingDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'performance',
            element: (
              <ProtectedRoute requiredPermission="reports.read">
                <PerformanceReportsPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Transit Management
      {
        path: 'transits',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="transits.read">
                <TransitsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute requiredPermission="transits.create">
                <CreateTransitPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="transits.read">
                <ViewTransitPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermission="transits.update">
                <EditTransitPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Production Management
      {
        path: 'productions',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute requiredPermission="production.read">
                <ProductionsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute requiredPermission="production.create">
                <CreateProductionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute requiredPermission="production.read">
                <ViewProductionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermission="production.update">
                <EditProductionPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Delivery
      {
        path: 'delivery',
        children: [
          {
            path: 'invoice-preview',
            element: <DeliveryInvoicePreview />,
          },
        ],
      },

      // Settings
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredPermission="settings.manage">
            <ProfilePage />
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
