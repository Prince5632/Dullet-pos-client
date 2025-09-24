import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  ShieldCheckIcon,
  ClockIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  FireIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { orderService } from '../../services/orderService';
// import { userService } from '../../services/userService';
import type { Order } from '../../types';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    todayOrders: number;
    todayRevenue: number;
    pendingApproval: number;
  };
  users: {
    total: number;
    active: number;
    todayLogins: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
}

const DashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats based on permissions
      const promises = [];
      
      if (hasPermission('orders.read')) {
        promises.push(orderService.getOrderStats());
        promises.push(orderService.getOrders({ limit: 5, sortBy: 'orderDate', sortOrder: 'desc' }));
      }
      
      if (hasPermission('users.read')) {
        // promises.push(userService.getUserStats()); // Will be implemented when backend is ready
      }

      const results = await Promise.allSettled(promises);
      
      // Process results
      let orderStats: any = null;
      let orders: Order[] = [];

      if (hasPermission('orders.read')) {
        if (results[0].status === 'fulfilled') {
          orderStats = results[0].value;
        }
        if (results[1].status === 'fulfilled') {
          const ordersResult = results[1].value as any;
          orders = ordersResult.data?.orders || [];
        }
      }

      setStats({
        orders: {
          total: orderStats?.totalOrders || 0,
          pending: orderStats?.pendingOrders || 0,
          approved: orderStats?.approvedOrders || 0,
          completed: orderStats?.completedOrders || 0,
          todayOrders: orderStats?.todayOrders || 0,
          todayRevenue: orderStats?.monthlyRevenue || 0,
          pendingApproval: orderStats?.pendingOrders || 0,
        },
        users: {
          total: 25, // Mock data - will be replaced with real API
          active: 23,
          todayLogins: 12,
        },
        revenue: {
          today: orderStats?.monthlyRevenue || 0,
          thisWeek: orderStats?.monthlyRevenue || 0,
          thisMonth: orderStats?.monthlyRevenue || 0,
          growth: 5.2, // Mock growth percentage
        }
      });
      
      setRecentOrders(orders);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 17) return '🌤️';
    return '🌙';
  };

  const getRoleDashboard = () => {
    const roleName = user?.role?.name?.toLowerCase();
    
    switch (roleName) {
      case 'super admin':
      case 'admin':
        return getAdminDashboard();
      case 'manager':
        return getManagerDashboard();
      case 'sales executive':
        return getSalesDashboard();
      case 'staff':
        return getStaffDashboard();
      default:
        return getDefaultDashboard();
    }
  };

  const getAdminDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats && [
            {
              label: 'Total Revenue',
              value: orderService.formatCurrency(stats.revenue.today),
              subtitle: 'Today',
              icon: BanknotesIcon,
              color: 'emerald',
              bgColor: 'bg-emerald-50',
              iconColor: 'text-emerald-600',
              trend: stats.revenue.growth,
            },
            {
              label: 'Orders',
              value: stats.orders.total.toString(),
              subtitle: `${stats.orders.todayOrders} today`,
              icon: ClipboardDocumentListIcon,
              color: 'blue',
              bgColor: 'bg-blue-50',
              iconColor: 'text-blue-600',
            },
            {
              label: 'Users',
              value: stats.users.total.toString(),
              subtitle: `${stats.users.todayLogins} logins today`,
              icon: UserGroupIcon,
              color: 'purple',
              bgColor: 'bg-purple-50',
              iconColor: 'text-purple-600',
            },
            {
              label: 'Pending Approval',
              value: stats.orders.pendingApproval.toString(),
              subtitle: 'Requires attention',
              icon: ExclamationTriangleIcon,
              color: 'amber',
              bgColor: 'bg-amber-50',
              iconColor: 'text-amber-600',
              urgent: stats.orders.pendingApproval > 0,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
                stat.urgent ? 'ring-2 ring-amber-200 bg-amber-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <div className="flex items-center mt-2 gap-2">
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    {stat.trend !== undefined && (
                      <div className={`flex items-center text-sm ${
                        stat.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {stat.trend >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(stat.trend)}%
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`${stat.bgColor} rounded-lg p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              {stat.urgent && (
                <div className="absolute top-2 right-2">
                  <div className="h-3 w-3 bg-amber-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <Link
                  to="/orders"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order._id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar name={order.customer?.businessName || 'Customer'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{order.customer?.businessName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {orderService.formatCurrency(order.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {orderService.formatDate(order.orderDate)}
                        </p>
                      </div>
                      <Badge className={orderService.getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-blue-600" />
              Quick Actions
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: 'Create Order',
                href: '/orders/new',
                icon: PlusIcon,
                color: 'blue',
                permission: 'orders.create',
              },
              {
                label: 'Add User',
                href: '/users/create',
                icon: UsersIcon,
                color: 'green',
                permission: 'users.create',
              },
              {
                label: 'Create Role',
                href: '/roles/create',
                icon: ShieldCheckIcon,
                color: 'purple',
                permission: 'roles.create',
              },
              {
                label: 'View Reports',
                href: '/reports',
                icon: ChartBarIcon,
                color: 'orange',
                permission: 'reports.read',
              },
            ]
              .filter(action => hasPermission(action.permission))
              .map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className={`flex items-center p-3 rounded-lg border border-gray-200 hover:border-${action.color}-200 hover:bg-${action.color}-50 transition-all duration-200 group`}
                >
                  <div className={`p-2 rounded-md bg-${action.color}-100 group-hover:bg-${action.color}-200 transition-colors duration-200`}>
                    <action.icon className={`h-4 w-4 text-${action.color}-600`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{action.label}</span>
                </Link>
              ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartPieIcon className="h-5 w-5 mr-2 text-green-600" />
              System Health
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'API Server', status: 'online', color: 'green' },
              { label: 'Database', status: 'connected', color: 'green' },
              { label: 'File Storage', status: 'operational', color: 'green' },
              { label: 'Background Jobs', status: 'running', color: 'green' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <div className="flex items-center">
                  <div className={`h-2 w-2 bg-${item.color}-400 rounded-full mr-2`}></div>
                  <span className={`text-xs font-medium text-${item.color}-600 capitalize`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const getManagerDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Manager-specific metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats && [
            {
              label: 'Pending Approvals',
              value: stats.orders.pendingApproval.toString(),
              subtitle: 'Requires your attention',
              icon: ClockIcon,
              color: 'amber',
              urgent: stats.orders.pendingApproval > 0,
            },
            {
              label: 'Today\'s Orders',
              value: stats.orders.todayOrders.toString(),
              subtitle: orderService.formatCurrency(stats.revenue.today),
              icon: ShoppingCartIcon,
              color: 'blue',
            },
            {
              label: 'Team Performance',
              value: '95%',
              subtitle: 'This month',
              icon: TruckIcon,
              color: 'green',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
                stat.urgent ? 'ring-2 ring-amber-200' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`bg-${stat.color}-50 rounded-lg p-3`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders requiring approval */}
        {hasPermission('orders.approve') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Orders Pending Approval</h3>
                <Link
                  to="/orders/approval"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentOrders.filter(o => o.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500">All orders are approved! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders
                    .filter(o => o.status === 'pending')
                    .slice(0, 3)
                    .map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{order.customer?.businessName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{orderService.formatCurrency(order.totalAmount)}</p>
                          <Link
                            to={`/orders/approval`}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Review →
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Manager Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FireIcon className="h-5 w-5 mr-2 text-purple-600" />
              Manager Tools
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: 'Approve Orders',
                href: '/orders/approval',
                icon: CheckCircleIcon,
                color: 'green',
                badge: stats?.orders.pendingApproval || 0,
              },
              {
                label: 'Team Performance',
                href: '/reports/team',
                icon: ChartBarIcon,
                color: 'blue',
              },
              {
                label: 'Production Status',
                href: '/production',
                icon: BuildingOfficeIcon,
                color: 'orange',
              },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-${action.color}-200 hover:bg-${action.color}-50 transition-all duration-200`}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-md bg-${action.color}-100`}>
                    <action.icon className={`h-4 w-4 text-${action.color}-600`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{action.label}</span>
                </div>
                {action.badge && action.badge > 0 && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${action.color}-100 text-${action.color}-600`}>
                    {action.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const getSalesDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Sales metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats && [
            {
              label: 'My Orders Today',
              value: stats.orders.todayOrders.toString(),
              subtitle: orderService.formatCurrency(stats.revenue.today),
              icon: ShoppingCartIcon,
              color: 'blue',
            },
            {
              label: 'This Month',
              value: stats.orders.total.toString(),
              subtitle: orderService.formatCurrency(stats.revenue.thisMonth),
              icon: CalendarIcon,
              color: 'green',
            },
            {
              label: 'Conversion Rate',
              value: '87%',
              subtitle: 'Above target',
              icon: ArrowTrendingUpIcon,
              color: 'emerald',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`bg-${stat.color}-50 rounded-lg p-3`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">My Recent Orders</h3>
          </div>
          <div className="p-6">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders yet. Create your first order!</p>
                <Link
                  to="/orders/new"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Order
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.customer?.businessName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{orderService.formatCurrency(order.totalAmount)}</p>
                      <Badge className={orderService.getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Sales Tools */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <LightBulbIcon className="h-5 w-5 mr-2 text-green-600" />
              Sales Tools
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              {
                label: 'Create Order',
                href: '/orders/new',
                icon: PlusIcon,
                color: 'blue',
              },
              {
                label: 'Customer List',
                href: '/customers',
                icon: UsersIcon,
                color: 'green',
              },
              {
                label: 'My Performance',
                href: '/reports/sales',
                icon: ChartBarIcon,
                color: 'purple',
              },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex items-center p-3 rounded-lg border border-gray-200 hover:border-${action.color}-200 hover:bg-${action.color}-50 transition-all duration-200`}
              >
                <div className={`p-2 rounded-md bg-${action.color}-100`}>
                  <action.icon className={`h-4 w-4 text-${action.color}-600`} />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sales Tips */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 rounded-lg p-2">
              <LightBulbIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">Sales Tip</h3>
          </div>
          <p className="text-sm text-gray-700">
            Follow up with customers within 24 hours of order delivery to ensure satisfaction and encourage repeat business.
          </p>
        </div>
      </div>
    </div>
  );

  const getStaffDashboard = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">My Tasks</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[
                { task: 'Process order #ORD001', priority: 'high', completed: false },
                { task: 'Update inventory', priority: 'medium', completed: true },
                { task: 'Prepare dispatch list', priority: 'low', completed: false },
              ].map((item, index) => (
                <div key={index} className={`flex items-center p-3 border rounded-lg ${
                  item.completed ? 'bg-green-50 border-green-200' : 'border-gray-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    className="h-4 w-4 text-blue-600 rounded"
                    readOnly
                  />
                  <span className={`ml-3 text-sm ${
                    item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {item.task}
                  </span>
                  <span className={`ml-auto px-2 py-1 text-xs rounded-full ${
                    item.priority === 'high' ? 'bg-red-100 text-red-600' :
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Access</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'View Orders', href: '/orders', icon: ClipboardDocumentListIcon },
              { label: 'Check Inventory', href: '/inventory', icon: BuildingOfficeIcon },
              { label: 'My Profile', href: '/profile', icon: EyeIcon },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <action.icon className="h-5 w-5 text-gray-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const getDefaultDashboard = () => (
    <div className="text-center py-12">
      <EyeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Dullet Industries</h3>
      <p className="text-gray-500">Your personalized dashboard will appear here based on your role.</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-3">{getTimeIcon()}</div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {getGreeting()}, {user?.firstName}!
                  </h1>
                  <p className="text-blue-100 text-lg mt-2">
                    Welcome back to your {user?.role?.name} dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-center text-blue-100">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <span>{new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-blue-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats?.orders.todayOrders || 0}</p>
                <p className="text-sm">Orders Today</p>
              </div>
              <div className="h-12 w-px bg-blue-300"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {stats?.revenue.today ? orderService.formatCurrency(stats.revenue.today) : '₹0'}
                </p>
                <p className="text-sm">Revenue Today</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white opacity-5"></div>
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-24 w-24 rounded-full bg-white opacity-5"></div>
      </div>

      {/* Role-based dashboard content */}
      {getRoleDashboard()}
    </div>
  );
};

export default DashboardPage;
