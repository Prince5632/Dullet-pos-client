import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  ShieldCheckIcon,
  ClockIcon,
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
  ClipboardDocumentListIcon,
  SparklesIcon,
  FireIcon,
  LightBulbIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { orderService } from '../../services/orderService';
import type { Order, Godown } from '../../types';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { userService } from '../../services/userService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface DashboardStats {
  orders: {
    total: number;
    totalVisits: number;
    pending: number;
    approved: number;
    completed: number;
    todayOrders: number;
    todayVisits: number;
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
    // growth: number;
  };
}

const DashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
        if (res.success && res.data) setGodowns(res.data.godowns);
      } catch {}
    })();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const promises = [];
      
      if (hasPermission('orders.read')) {
        promises.push(orderService.getOrderStats({ godownId: selectedGodownId }));
        promises.push(orderService.getOrders({ limit: 5, sortBy: 'orderDate', sortOrder: 'desc', godownId: selectedGodownId }));
      }
      // Removed user stats endpoint (not available); we'll compute via list fallback below

      const results = await Promise.allSettled(promises);
      
      let orderStats: any = null;
      let orders: Order[] = [];
      let userStats: { totalUsers: number; activeUsers: number; todayLogins: number; inactiveUsers: number } | null = null;

      // Map settled results based on what we pushed
      let idx = 0;
      if (hasPermission('orders.read')) {
        if (results[idx]?.status === 'fulfilled') {
          orderStats = (results[idx] as PromiseFulfilledResult<any>).value;
        }
        idx += 1;
        if (results[idx]?.status === 'fulfilled') {
          const ordersResult = (results[idx] as PromiseFulfilledResult<any>).value as any;
          orders = ordersResult.data?.orders || [];
        }
        idx += 1;
      }
      // No direct user stats in results

      // Fallback: compute user counts from paginated list if stats unavailable
      if (hasPermission('users.read')) {
        try {
          // Use the same API call as user management page
          const response = await userService.getUsers({ 
            page: 1,
            limit: 1, 
            isActive: 'true'
          });
          
          // Get count from data.pagination.totalUsers (based on actual API response structure)
          const activeUsers = response.data?.pagination?.totalUsers || 0;
          
          userStats = {
            totalUsers: activeUsers, // Show only active users count
            activeUsers,
            todayLogins: 0,
            inactiveUsers: 0,
          };
        } catch (err) {
          console.error('Failed to fetch user stats:', err);
        }
      }

      setStats({
        orders: {
          total: orderStats?.totalOrders || 0,
          totalVisits: orderStats?.totalVisits || 0,
          pending: orderStats?.pendingOrders || 0,
          approved: orderStats?.approvedOrders || 0,
          completed: orderStats?.completedOrders || 0,
          todayOrders: orderStats?.todayOrders || 0,
          todayVisits: orderStats?.todayVisits || 0,
          todayRevenue: orderStats?.monthlyRevenue || 0,
          pendingApproval: orderStats?.pendingOrders || 0,
        },
        users: {
          total: userStats?.totalUsers ?? 0,
          active: userStats?.activeUsers ?? 0,
          todayLogins: userStats?.todayLogins ?? 0,
        },
        revenue: {
          today: orderStats?.monthlyRevenue || 0,
          thisWeek: orderStats?.monthlyRevenue || 0,
          thisMonth: orderStats?.monthlyRevenue || 0,
          // growth: 5.2,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const roleName = user?.role?.name?.toLowerCase();

  return (
    <div className="space-y-4 pb-6">
      {/* Compact Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{getTimeIcon()}</span>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                    {getGreeting()}, {user?.firstName}!
                  </h1>
                  <p className="text-emerald-100 text-xs sm:text-sm truncate">
                    {user?.role?.name} Dashboard
                  </p>
                </div>
              </div>
            </div>
            
            {/* Today's Quick Stats */}
            {/* <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right">
                <p className="text-lg sm:text-xl font-bold text-white">{stats?.orders.todayOrders || 0}</p>
                <p className="text-[10px] sm:text-xs text-emerald-100">Today</p>
              </div>
              <div className="h-8 w-px bg-emerald-300/50"></div>
              <div className="text-right">
                <p className="text-lg sm:text-xl font-bold text-white">
                  ₹{((stats?.revenue.today || 0) / 1000).toFixed(0)}k
                </p>
                <p className="text-[10px] sm:text-xs text-emerald-100">Revenue</p>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Godown Selector - Compact */}
      {godowns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={selectedGodownId}
              onChange={(e) => { setSelectedGodownId(e.target.value); fetchDashboardData(); }}
              className="flex-1 text-sm border-0 focus:ring-0 bg-transparent text-gray-700 font-medium"
            >
              <option value="">All Godowns</option>
              {godowns.map(g => (
                <option key={g._id} value={g._id}>
                  {g.name} - {g.location.city}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Role-based Content */}
      {(roleName === 'super admin' || roleName === 'admin') && (
        <>
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats && [
              {
                label: 'Revenue',
                value: `₹${((stats.revenue.today || 0) / 1000).toFixed(1)}k`,
                subtitle: 'Today',
                icon: BanknotesIcon,
                bgColor: 'bg-emerald-500',
                // trend: stats.revenue.growth,
              },
              {
                label: 'Orders',
                value: stats.orders.total.toString(),
                subtitle: 'Total',
                icon: ClipboardDocumentListIcon,
                bgColor: 'bg-blue-500',
              },
              {
                label: 'Pending',
                value: stats.orders.pendingApproval.toString(),
                subtitle: 'Approval',
                icon: ExclamationTriangleIcon,
                bgColor: 'bg-amber-500',
                urgent: stats.orders.pendingApproval > 0,
              },
              {
                label: 'Users',
                value: stats.users.total.toString(),
                subtitle: 'Active users',
                icon: UserGroupIcon,
                bgColor: 'bg-purple-500',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`relative bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm ${
                  stat.urgent ? 'ring-2 ring-amber-200' : ''
                }`}
              >
                <div className={`${stat.bgColor} rounded-lg p-2 w-fit mb-2`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.trend !== undefined && (
                    <span className={`text-xs ${stat.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.trend >= 0 ? '↑' : '↓'}{Math.abs(stat.trend)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-gray-400">{stat.subtitle}</p>
                {stat.urgent && (
                  <div className="absolute top-2 right-2 h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2 text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'New Order', href: '/orders/new', icon: PlusIcon, color: 'blue', permission: 'orders.create' },
                { label: 'Add User', href: '/users/create', icon: UsersIcon, color: 'green', permission: 'users.create' },
                { label: 'New Role', href: '/roles/create', icon: ShieldCheckIcon, color: 'purple', permission: 'roles.create' },
                { label: 'Approvals', href: '/orders/approval', icon: CheckCircleIcon, color: 'amber', permission: 'orders.approve' },
              ]
                .filter(action => hasPermission(action.permission))
                .map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95"
                  >
                    <div className={`p-2 rounded-lg bg-${action.color}-100 mb-2`}>
                      <action.icon className={`h-4 w-4 text-${action.color}-600`} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
                  </Link>
                ))}
            </div>
          </div>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
                <Link to="/orders" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
                  View all <ChevronRightIcon className="h-3 w-3 ml-1" />
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {recentOrders.slice(0, 5).map((order) => (
                  <Link
                    key={order._id}
                    to={`/orders/${order._id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Avatar name={order.customer?.businessName || 'Customer'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 truncate">{order.customer?.businessName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{((order.totalAmount || 0) / 1000).toFixed(1)}k
                      </p>
                      <Badge className={`${orderService.getStatusColor(order.status)} text-[10px] px-1.5 py-0.5`}>
                        {order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {roleName === 'manager' && (
        <>
          {/* Manager Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats && [
              {
                label: 'Pending',
                value: stats.orders.pendingApproval.toString(),
                subtitle: 'Approvals',
                icon: ClockIcon,
                bgColor: 'bg-amber-500',
                urgent: stats.orders.pendingApproval > 0,
              },
              {
                label: 'Today',
                value: stats.orders.todayOrders.toString(),
                subtitle: 'Orders',
                icon: ShoppingCartIcon,
                bgColor: 'bg-blue-500',
              },
              {
                label: 'Team',
                value: '95%',
                subtitle: 'Performance',
                icon: TruckIcon,
                bgColor: 'bg-green-500',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm ${
                  stat.urgent ? 'ring-2 ring-amber-200' : ''
                }`}
              >
                <div className={`${stat.bgColor} rounded-lg p-2 w-fit mb-2`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-gray-400">{stat.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Manager Actions */}
          {/* <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <FireIcon className="h-4 w-4 mr-2 text-orange-600" />
              Manager Tools
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Approve Orders', href: '/orders/approval', icon: CheckCircleIcon, badge: stats?.orders.pendingApproval },
                { label: 'Team Performance', href: '/reports/team', icon: ChartBarIcon },
                { label: 'Production Status', href: '/production', icon: BuildingOfficeIcon },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">{action.label}</span>
                  </div>
                  {action.badge && action.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                      {action.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div> */}
        </>
      )}

      {roleName === 'sales executive' && (
        <>
          {/* Sales Stats */}
          {/* <div className="grid grid-cols-3 gap-3">
            {stats && [
              {
                label: 'Today',
                value: stats.orders.todayOrders.toString(),
                subtitle: `₹${((stats.revenue.today || 0) / 1000).toFixed(0)}k`,
                icon: ShoppingCartIcon,
                bgColor: 'bg-blue-500',
              },
              {
                label: 'Month',
                value: stats.orders.total.toString(),
                subtitle: 'Orders',
                icon: CalendarIcon,
                bgColor: 'bg-green-500',
              },
              // {
              //   label: 'Rate',
              //   value: '87%',
              //   subtitle: 'Convert',
              //   icon: ArrowTrendingUpIcon,
              //   bgColor: 'bg-emerald-500',
              // },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <div className={`${stat.bgColor} rounded-lg p-2 w-fit mb-2`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-gray-400">{stat.subtitle}</p>
              </div>
            ))}
          </div> */}

          {/* Sales Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <LightBulbIcon className="h-4 w-4 mr-2 text-yellow-600" />
              Sales Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'New Order', href: '/orders/new', icon: PlusIcon },
                { label: 'Create Visit', href: '/visits/new', icon: UsersIcon },
        
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95"
                >
                  <action.icon className="h-5 w-5 text-gray-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Sales Tip */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
            <div className="flex gap-3">
              <div className="bg-blue-100 rounded-lg p-2 h-fit">
                <LightBulbIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">💡 Pro Tip</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Follow up within 24 hours of delivery to boost customer satisfaction and repeat orders.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Orders for Sales/Manager */}
      {(roleName === 'manager' || roleName === 'sales executive') && recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">My Recent Orders</h3>
            <Link to="/orders" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
              View all <ChevronRightIcon className="h-3 w-3 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.slice(0, 5).map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Avatar name={order.customer?.businessName || 'Customer'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{order.customer?.businessName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{((order.totalAmount || 0) / 1000).toFixed(1)}k
                  </p>
                  <Badge className={`${orderService.getStatusColor(order.status)} text-[10px] px-1.5 py-0.5`}>
                    {order.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;