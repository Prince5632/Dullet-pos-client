import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { orderService } from "../../services/orderService";
import type { Order, Godown } from "../../types";
import { apiService } from "../../services/api";
import { API_CONFIG } from "../../config/api";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import { userService } from "../../services/userService";
import LoadingSpinner from "../../components/common/LoadingSpinner";

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
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(
          API_CONFIG.ENDPOINTS.GODOWNS
        );
        if (res.success && res.data) setGodowns(res.data.godowns);
      } catch {}
    })();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (godownId?: string) => {
    try {
      setLoading(true);

      const promises = [];

      if (hasPermission("orders.read")) {
        promises.push(
          orderService.getOrderStats({ godownId: godownId ?? selectedGodownId })
        );
        promises.push(
          orderService.getOrders({
            limit: 5,
            sortBy: "orderDate",
            sortOrder: "desc",
            godownId: godownId ?? selectedGodownId,
          })
        );
      }
      // Removed user stats endpoint (not available); we'll compute via list fallback below

      const results = await Promise.allSettled(promises);

      let orderStats: any = null;
      let orders: Order[] = [];
      let userStats: {
        totalUsers: number;
        activeUsers: number;
        todayLogins: number;
        inactiveUsers: number;
      } | null = null;

      // Map settled results based on what we pushed
      let idx = 0;
      if (hasPermission("orders.read")) {
        if (results[idx]?.status === "fulfilled") {
          orderStats = (results[idx] as PromiseFulfilledResult<any>).value;
        }
        idx += 1;
        if (results[idx]?.status === "fulfilled") {
          const ordersResult = (results[idx] as PromiseFulfilledResult<any>)
            .value as any;
          orders = ordersResult.data?.orders || [];
        }
        idx += 1;
      }
      // No direct user stats in results

      // Fallback: compute user counts from paginated list if stats unavailable
      if (hasPermission("users.read")) {
        try {
          // Use the same API call as user management page
          const response = await userService.getUsers({
            page: 1,
            limit: 1,
            isActive: "true",
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
          console.error("Failed to fetch user stats:", err);
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
        },
      });

      setRecentOrders(orders);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchDashboardData(selectedGodownId);
    } catch (error) {
      console.error("Failed to sync dashboard data:", error);
    } finally {
      setSyncing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "☀️";
    if (hour < 17) return "🌤️";
    return "🌙";
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
    <div className="space-y-4 pb-6 px-2 sm:px-0">
      {/* Enhanced Responsive Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-xl sm:rounded-2xl shadow-lg">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative px-3 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl sm:text-3xl">{getTimeIcon()}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
                    {getGreeting()}, {user?.firstName}!
                  </h1>
                  <p className="text-emerald-100 text-xs sm:text-sm truncate">
                    {user?.role?.name} Dashboard
                  </p>
                </div>
                {/* Mobile Sync Button */}
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="sm:hidden cursor-pointer p-2 text-white hover:bg-emerald-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync Dashboard Data"
                >
                  <ArrowPathIcon 
                    className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} 
                  />
                </button>
              </div>
            </div>

            {/* Today's Quick Stats - Hidden on mobile, shown on larger screens */}
            <div className="hidden sm:flex items-center gap-3 md:gap-4">
              <div className="text-right">
                <p className="text-lg md:text-xl font-bold text-white">{stats?.orders.todayOrders || 0}</p>
                <p className="text-xs text-emerald-100">Today's Orders</p>
              </div>
              <div className="h-8 w-px bg-emerald-300/50"></div>
              <div className="text-right">
                <p className="text-lg md:text-xl font-bold text-white">
                  ₹{((stats?.revenue.today || 0) / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-emerald-100">Revenue</p>
              </div>
              <div className="h-8 w-px bg-emerald-300/50"></div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-2 cursor-pointer text-white hover:bg-emerald-600/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync Dashboard Data"
              >
                <ArrowPathIcon 
                  className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {(roleName === "super admin" || roleName === "admin" || roleName === "manager") && (
        <>
          {/* Enhanced Responsive Godown Selector */}
          {godowns.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-700">
                  Select Godown
                </span>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {/* All Godowns card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGodownId("");
                    fetchDashboardData("");
                  }}
                  className={`text-left cursor-pointer rounded-lg border p-3 transition-all duration-300 transform hover:scale-105 ${
                    selectedGodownId === ""
                      ? "border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 shadow-md"
                      : "border-gray-200 hover:border-indigo-200 hover:bg-gradient-to-br hover:from-indigo-25 hover:to-purple-25"
                  }`}
                  aria-pressed={selectedGodownId === ""}
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-2 rounded-md flex-shrink-0 ${
                      selectedGodownId === ""
                        ? "bg-indigo-100"
                        : "bg-gradient-to-br from-indigo-50 to-purple-50"
                    }`}>
                      <BuildingOfficeIcon className={`h-4 w-4 ${
                        selectedGodownId === ""
                          ? "text-indigo-600"
                          : "text-indigo-500"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${
                        selectedGodownId === ""
                          ? "text-indigo-700"
                          : "text-gray-900"
                      }`}>
                        All Godowns
                      </p>
                      <span className={`inline-block text-[10px] rounded px-1.5 py-0.5 mt-1 ${
                        selectedGodownId === ""
                          ? "text-indigo-700 bg-indigo-200"
                          : "text-indigo-600 bg-indigo-100"
                      }`}>
                        Orders: {godowns.reduce((sum, x) => sum + (x.orderCount || 0), 0)}
                      </span>
                      <p className={`text-xs mt-1 ${
                        selectedGodownId === ""
                          ? "text-indigo-600"
                          : "text-gray-500"
                      }`}>
                        View across locations
                      </p>
                    </div>
                  </div>
                </button>

                {godowns.map((g, index) => {
                  // Create varied light color schemes for each godown
                  const colorSchemes = [
                    {
                      gradient: "from-blue-50 via-cyan-50 to-teal-50",
                      hoverGradient: "hover:from-blue-25 hover:to-cyan-25",
                      iconBg: "bg-gradient-to-br from-blue-100 to-cyan-100",
                      iconColor: "text-blue-600",
                      selectedIconBg: "bg-blue-100",
                      selectedIconColor: "text-blue-700",
                      selectedTextColor: "text-blue-800",
                      selectedBadgeColor: "text-blue-700 bg-blue-200",
                      badgeColor: "text-blue-600 bg-blue-100",
                      hoverBorder: "hover:border-blue-200"
                    },
                    {
                      gradient: "from-emerald-50 via-green-50 to-lime-50",
                      hoverGradient: "hover:from-emerald-25 hover:to-green-25",
                      iconBg: "bg-gradient-to-br from-emerald-100 to-green-100",
                      iconColor: "text-emerald-600",
                      selectedIconBg: "bg-emerald-100",
                      selectedIconColor: "text-emerald-700",
                      selectedTextColor: "text-emerald-800",
                      selectedBadgeColor: "text-emerald-700 bg-emerald-200",
                      badgeColor: "text-emerald-600 bg-emerald-100",
                      hoverBorder: "hover:border-emerald-200"
                    },
                    {
                      gradient: "from-orange-50 via-amber-50 to-yellow-50",
                      hoverGradient: "hover:from-orange-25 hover:to-amber-25",
                      iconBg: "bg-gradient-to-br from-orange-100 to-amber-100",
                      iconColor: "text-orange-600",
                      selectedIconBg: "bg-orange-100",
                      selectedIconColor: "text-orange-700",
                      selectedTextColor: "text-orange-800",
                      selectedBadgeColor: "text-orange-700 bg-orange-200",
                      badgeColor: "text-orange-600 bg-orange-100",
                      hoverBorder: "hover:border-orange-200"
                    },
                    {
                      gradient: "from-violet-50 via-purple-50 to-indigo-50",
                      hoverGradient: "hover:from-violet-25 hover:to-purple-25",
                      iconBg: "bg-gradient-to-br from-violet-100 to-purple-100",
                      iconColor: "text-violet-600",
                      selectedIconBg: "bg-violet-100",
                      selectedIconColor: "text-violet-700",
                      selectedTextColor: "text-violet-800",
                      selectedBadgeColor: "text-violet-700 bg-violet-200",
                      badgeColor: "text-violet-600 bg-violet-100",
                      hoverBorder: "hover:border-violet-200"
                    },
                    {
                      gradient: "from-rose-50 via-pink-50 to-fuchsia-50",
                      hoverGradient: "hover:from-rose-25 hover:to-pink-25",
                      iconBg: "bg-gradient-to-br from-rose-100 to-pink-100",
                      iconColor: "text-rose-600",
                      selectedIconBg: "bg-rose-100",
                      selectedIconColor: "text-rose-700",
                      selectedTextColor: "text-rose-800",
                      selectedBadgeColor: "text-rose-700 bg-rose-200",
                      badgeColor: "text-rose-600 bg-rose-100",
                      hoverBorder: "hover:border-rose-200"
                    }
                  ];
                  
                  const colorScheme = colorSchemes[index % colorSchemes.length];
                  
                  return (
                    <button
                      key={g._id}
                      type="button"
                      onClick={() => {
                        setSelectedGodownId(g._id);
                        fetchDashboardData(g._id);
                      }}
                      className={`text-left cursor-pointer rounded-lg border p-3 transition-all duration-300 transform hover:scale-105 ${
                        selectedGodownId === g._id
                          ? `border-gray-200 bg-gradient-to-br ${colorScheme.gradient} shadow-md`
                          : `border-gray-200 ${colorScheme.hoverBorder} hover:bg-gradient-to-br ${colorScheme.hoverGradient}`
                      }`}
                      aria-pressed={selectedGodownId === g._id}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-2 rounded-md flex-shrink-0 ${
                          selectedGodownId === g._id
                            ? colorScheme.selectedIconBg
                            : colorScheme.iconBg
                        }`}>
                          <BuildingOfficeIcon className={`h-4 w-4 ${
                            selectedGodownId === g._id
                              ? colorScheme.selectedIconColor
                              : colorScheme.iconColor
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${
                            selectedGodownId === g._id
                              ? colorScheme.selectedTextColor
                              : "text-gray-900"
                          }`}>
                            {g.name}
                          </p>
                          <span className={`inline-block text-[10px] rounded px-1.5 py-0.5 mt-1 ${
                            selectedGodownId === g._id
                              ? colorScheme.selectedBadgeColor
                              : colorScheme.badgeColor
                          }`}>
                            Orders: {g.orderCount ?? 0}
                          </span>
                          <p className={`text-xs mt-1 ${
                            selectedGodownId === g._id
                              ? `${colorScheme.selectedTextColor.replace('800', '600')}`
                              : "text-gray-500"
                          }`}>
                            {g.location.city}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Role-based Content */}
      {(roleName === "super admin" || roleName === "admin") && (
        <>
          {/* Enhanced Responsive Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats &&
              [
                {
                  label: "Revenue",
                  value: `₹${((stats.revenue.today || 0) / 1000).toFixed(1)}k`,
                  subtitle: "",
                  icon: BanknotesIcon,
                  bgColor: "bg-emerald-500",
                  link: "/reports/sales-executives",
                },
                {
                  label: "Orders",
                  value: stats.orders.total.toString(),
                  subtitle: "Total",
                  icon: ClipboardDocumentListIcon,
                  bgColor: "bg-blue-500",
                  link: "/orders",
                },
                {
                  label: "Pending",
                  value: stats.orders.pendingApproval.toString(),
                  subtitle: "Approval",
                  icon: ExclamationTriangleIcon,
                  bgColor: "bg-amber-500",
                  urgent: stats.orders.pendingApproval > 0,
                  link: "/orders",
                },
                {
                  label: "Users",
                  value: stats.users.total.toString(),
                  subtitle: "Active users",
                  icon: UserGroupIcon,
                  bgColor: "bg-purple-500",
                  link: "/users",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`relative cursor-pointer bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm transition-all hover:shadow-md ${
                    stat.urgent ? "ring-2 ring-amber-200" : ""
                  }`}
                  onClick={() => navigate(stat.link)}
                >
                  <div className={`${stat.bgColor} rounded-lg p-2 w-fit mb-2`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{stat.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{stat.subtitle}</p>
                  {stat.urgent && (
                    <div className="absolute top-2 right-2 h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
                  )}
                </div>
              ))}
          </div>

          {/* Enhanced Responsive Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2 text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                {
                  label: "New Order",
                  href: "/orders/new",
                  icon: PlusIcon,
                  color: "blue",
                  permission: "orders.create",
                },
                {
                  label: "Add User",
                  href: "/users/create",
                  icon: UsersIcon,
                  color: "green",
                  permission: "users.create",
                },
                {
                  label: "New Role",
                  href: "/roles/create",
                  icon: ShieldCheckIcon,
                  color: "purple",
                  permission: "roles.create",
                },
                {
                  label: "Approvals",
                  href: "/orders/approval",
                  icon: CheckCircleIcon,
                  color: "amber",
                  permission: "orders.approve",
                },
              ]
                .filter((action) => hasPermission(action.permission))
                .map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95"
                  >
                    <div
                      className={`p-2 rounded-lg bg-${action.color}-100 mb-2`}
                    >
                      <action.icon
                        className={`h-4 w-4 text-${action.color}-600`}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                      {action.label}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </>
      )}

      {roleName === "manager" && (
        <>
          {/* Enhanced Responsive Manager Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {stats &&
              [
                {
                  label: "Pending",
                  value: stats.orders.pendingApproval.toString(),
                  subtitle: "Approvals",
                  icon: ClockIcon,
                  bgColor: "bg-amber-500",
                  urgent: stats.orders.pendingApproval > 0,
                  link: "/orders",
                },
                {
                  label: "Today",
                  value: stats.orders.todayOrders.toString(),
                  subtitle: "Orders",
                  icon: ShoppingCartIcon,
                  bgColor: "bg-blue-500",
                  link: "/orders",
                },
                {
                  label: "Team",
                  value: "95%",
                  subtitle: "Performance",
                  icon: TruckIcon,
                  bgColor: "bg-green-500",
                  link: "/reports/sales-executives",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`cursor-pointer bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm transition-all hover:shadow-md ${
                    stat.urgent ? "ring-2 ring-amber-200" : ""
                  }`}
                  onClick={() => navigate(stat.link)}
                >
                  <div className={`${stat.bgColor} rounded-lg p-2 w-fit mb-2`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {stat.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{stat.subtitle}</p>
                </div>
              ))}
          </div>
        </>
      )}

      {roleName === "sales executive" && (
        <>
          {/* Enhanced Responsive Sales Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <LightBulbIcon className="h-4 w-4 mr-2 text-yellow-600" />
              Sales Tools
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: "New Order", href: "/orders/new", icon: PlusIcon },
                { label: "Create Visit", href: "/visits/new", icon: UsersIcon },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95"
                >
                  <action.icon className="h-5 w-5 text-gray-600 mb-2" />
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Enhanced Responsive Sales Tip */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 sm:p-4">
            <div className="flex gap-3">
              <div className="bg-blue-100 rounded-lg p-2 h-fit flex-shrink-0">
                <LightBulbIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  💡 Pro Tip
                </h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Follow up within 24 hours of delivery to boost customer
                  satisfaction and repeat orders.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Responsive Recent Orders */}
      {(roleName === "super admin" || roleName === "admin" || roleName === "manager") &&
        recentOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Recent Orders
              </h3>
              <Link
                to="/orders"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center"
              >
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <ChevronRightIcon className="h-3 w-3 ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOrders.slice(0, 5).map((order) => (
                <Link
                  key={order._id}
                  to={`/orders/${order._id}`}
                  className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Avatar
                    name={order.customer?.businessName || "Customer"}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.customer?.businessName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{((order.totalAmount || 0) / 1000).toFixed(1)}k
                    </p>
                    <Badge
                      className={`${orderService.getStatusColor(
                        order.status
                      )} text-[10px] px-1.5 py-0.5`}
                    >
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
