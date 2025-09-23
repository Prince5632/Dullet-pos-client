import React from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../../config/api';
import type { NavItem } from '../../types';
import { cn } from '../../utils';

interface SidebarProps {
  navigation: NavItem[];
  currentPath: string;
  mobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ navigation, currentPath, mobile = false }) => {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-white">D</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{APP_CONFIG.COMPANY_NAME}</h1>
            <p className="text-xs text-gray-500">POS System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = currentPath === item.href || 
                  (item.href !== '/dashboard' && currentPath.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-6 w-6 shrink-0 transition-colors duration-200',
                          isActive 
                            ? 'text-blue-600' 
                            : 'text-gray-400 group-hover:text-blue-600'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* Bottom section */}
          <li className="mt-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">v{APP_CONFIG.APP_VERSION}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">System Version</p>
                  <p className="text-xs text-gray-500">Latest Update</p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
