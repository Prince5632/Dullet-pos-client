import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../../config/api';
import type { NavItem } from '../../types';
import { cn } from '../../utils';

interface SidebarProps {
  navigation: NavItem[];
  currentPath: string;
  mobile?: boolean;
  onClose?: () => void; // Add callback to close mobile sidebar
}

const Sidebar: React.FC<SidebarProps> = ({ 
  navigation, 
  currentPath, 
  mobile = false,
  onClose 
}) => {
  const navigate = useNavigate();

  // Handle navigation item click
  const handleNavClick = (href: string) => {
    navigate(href);
    // Close mobile sidebar when item is clicked
    if (mobile && onClose) {
      onClose();
    }
  };

  return (
    <div className={cn(
      "flex grow flex-col gap-y-4 overflow-y-auto bg-white border-gray-200",
      mobile 
        ? "h-full px-4 pb-4" // Mobile: full height, smaller padding
        : "border-r px-6 pb-4" // Desktop: border right, larger padding
    )}>
      {/* Logo */}
      <div className={cn(
        "flex shrink-0 items-center",
        mobile ? "h-14 pt-2" : "h-16" // Smaller height on mobile
      )}>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "bg-blue-600 rounded-lg flex items-center justify-center",
            mobile ? "w-7 h-7" : "w-8 h-8" // Smaller logo on mobile
          )}>
            <span className={cn(
              "font-bold text-white",
              mobile ? "text-base" : "text-lg"
            )}>D</span>
          </div>
          <div>
            <h1 className={cn(
              "font-bold text-gray-900",
              mobile ? "text-base" : "text-lg"
            )}>
              {APP_CONFIG.COMPANY_NAME}
            </h1>
            <p className={cn(
              "text-gray-500",
              mobile ? "text-xs" : "text-xs"
            )}>
              POS System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-5">
          <li>
            <ul role="list" className={cn(
              "space-y-1",
              mobile ? "-mx-1" : "-mx-2" // Smaller negative margin on mobile
            )}>
              {navigation.map((item) => {
                const isActive = currentPath === item.href || 
                  (item.href !== '/dashboard' && currentPath.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        'w-full group flex gap-x-3 rounded-md text-sm leading-6 font-semibold transition-all duration-200 text-left',
                        mobile 
                          ? 'p-2.5 active:scale-[0.98]' // Slightly larger padding and scale effect on mobile
                          : 'p-2 hover:scale-[1.02]', // Subtle hover scale on desktop
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm' + (mobile ? '' : ' border-r-2 border-blue-600')
                          : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'shrink-0 transition-colors duration-200',
                          mobile ? 'h-5 w-5' : 'h-6 w-6', // Smaller icons on mobile
                          isActive 
                            ? 'text-blue-600' 
                            : 'text-gray-400 group-hover:text-blue-600'
                        )}
                        aria-hidden="true"
                      />
                      <span className={cn(
                        mobile ? 'text-sm' : 'text-sm'
                      )}>
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>

          {/* Bottom section - Only show on desktop or larger mobile screens */}
          {/* <li className={cn(
            "mt-auto",
            mobile ? "hidden sm:block" : "block"
          )}>
            <div className={cn(
              "bg-gray-50 rounded-lg",
              mobile ? "p-3" : "p-4"
            )}>
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "bg-blue-100 rounded-full flex items-center justify-center",
                  mobile ? "w-8 h-8" : "w-10 h-10"
                )}>
                  <span className={cn(
                    "font-medium text-blue-600",
                    mobile ? "text-xs" : "text-sm"
                  )}>
                    v{APP_CONFIG.APP_VERSION}
                  </span>
                </div>
                <div>
                  <p className={cn(
                    "font-medium text-gray-900",
                    mobile ? "text-xs" : "text-sm"
                  )}>
                    System Version
                  </p>
                  <p className={cn(
                    "text-gray-500",
                    mobile ? "text-xs" : "text-xs"
                  )}>
                    Latest Update
                  </p>
                </div>
              </div>
            </div>
          </li> */}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
