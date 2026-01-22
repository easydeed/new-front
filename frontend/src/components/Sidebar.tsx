'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { AuthManager } from '../utils/auth';
import { Home, FileText, FolderOpen, Users, UserPlus, Settings, Shield, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    // Check role from stored user data or JWT
    const user = AuthManager.getUser();
    const role = user?.role?.toLowerCase().trim() || '';
    setIsAdmin(['admin', 'administrator', 'superadmin', 'super_admin', 'owner'].includes(role));
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    AuthManager.logout();
    window.location.href = '/login';
  };

  // Base nav items (shown to all users)
  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/deed-builder', icon: FileText, label: 'Create Deed' },
    { href: '/past-deeds', icon: FolderOpen, label: 'Past Deeds' },
    { href: '/shared-deeds', icon: Users, label: 'Shared Deeds' },
    { href: '/partners', icon: UserPlus, label: 'Partners' },
    { href: '/account-settings', icon: Settings, label: 'Settings' },
    // Admin link - only added if user is admin (see below)
  ];

  // Add admin link only for admin users
  if (isAdmin) {
    navItems.push({ href: '/admin', icon: Shield, label: 'Admin' });
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav 
      className={`bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7C4DFF] rounded-lg flex items-center justify-center text-white font-bold text-lg">
              DP
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F2B37]">DeedPro</h2>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-[#7C4DFF] rounded-lg flex items-center justify-center text-white font-bold text-lg mx-auto">
            DP
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 transition-colors z-10 shadow-sm"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Navigation Links */}
      <ul className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-3.5 rounded-lg font-medium 
                  transition-all duration-200 ease-out
                  ${active 
                    ? 'bg-[#7C4DFF]/15 text-[#7C4DFF] border-l-3 border-[#7C4DFF] shadow-sm' 
                    : 'text-gray-700 hover:bg-[#7C4DFF]/10 hover:text-[#7C4DFF] hover:translate-x-1'
                  }
                `}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${active ? 'text-[#7C4DFF] scale-110' : ''}`} />
                {!isCollapsed && (
                  <span className="text-base">{item.label}</span>
                )}
              </Link>
            </li>
          );
        })}

        {/* Logout Button */}
        <li className="pt-4 mt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors group w-full"
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-base">Logout</span>
            )}
          </button>
        </li>
      </ul>
    </nav>
  );
}
