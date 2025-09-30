import React, { useState, Fragment } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import type { NavItem } from '../../types';
import Sidebar from '../navigation/Sidebar';
import TopBar from '../navigation/TopBar.tsx';

// Navigation items with permissions
const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ClipboardDocumentListIcon,
    permission: 'orders.read',
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: CalendarDaysIcon,
    permission: 'attendance.read',
  },
  {
    name: 'User Management',
    href: '/users',
    icon: UsersIcon,
    permission: 'users.read',
  },
  {
    name: 'Role Management',
    href: '/roles',
    icon: ShieldCheckIcon,
    permission: 'roles.read',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    permission: 'settings.manage',
  },
];

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasPermission } = useAuth();
  const location = useLocation();

  // Filter navigation items based on user permissions
  const filteredNavigation = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                <Sidebar
                  navigation={filteredNavigation}
                  currentPath={location.pathname}
                  mobile={true}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <Sidebar
          navigation={filteredNavigation}
          currentPath={location.pathname}
          mobile={false}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar - Compact */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content - Mobile-optimized padding */}
        <main className="py-3 sm:py-4">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;