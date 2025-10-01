import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { cn, getInitials, getAvatarColor } from '../../utils';
import { resolveCapturedImageSrc } from '../../utils/image';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userNavigation = [
    { name: 'Your Profile', href: '/profile', icon: UserCircleIcon },
    // { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      {/* Search and actions */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <div className="relative flex flex-1">
          {/* We can add a search bar here in the future */}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          {/* <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button> */}

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <span className="sr-only">Open user menu</span>
              
              {/* User avatar */}
              {user?.profilePhoto ? (
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src={resolveCapturedImageSrc(user.profilePhoto)}
                  alt={user.fullName}
                />
              ) : (
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                  getAvatarColor(user?.fullName || 'User')
                )}>
                  {getInitials(user?.fullName || 'User')}
                </div>
              )}
              
              {/* User info */}
              <span className="hidden lg:flex lg:items-center ml-3">
                <span className="text-sm font-semibold leading-6 text-gray-900">
                  {user?.fullName}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {user?.role?.name}
                </span>
              </span>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                {/* User info in mobile */}
                <div className="px-3 py-2 lg:hidden border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-500">{user?.role?.name}</p>
                </div>

                {/* Navigation items */}
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm text-gray-700 transition-colors duration-200',
                          active ? 'bg-gray-50' : ''
                        )}
                      >
                        <item.icon className="h-4 w-4 mr-3 text-gray-400" />
                        {item.name}
                      </Link>
                    )}
                  </Menu.Item>
                ))}

                {/* Logout */}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-sm text-gray-700 transition-colors duration-200',
                        active ? 'bg-gray-50' : ''
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
