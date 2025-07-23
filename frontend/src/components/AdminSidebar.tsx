'use client';

import React from 'react';

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
}

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: {
    total_users: number;
    active_users: number;
    total_deeds: number;
    deeds_this_month: number;
    total_revenue: number;
    monthly_revenue: number;
    api_calls_today: number;
    api_calls_month: number;
    system_health: string;
    active_integrations: number;
  };
  notifications: Notification[];
}

export default function AdminSidebar({ activeTab, setActiveTab, stats, notifications }: AdminSidebarProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '📊',
      description: 'Platform metrics and quick actions'
    },
    {
      id: 'users',
      label: 'User Management',
      icon: '👥',
      description: 'Manage users, subscriptions, and API access'
    },
    {
      id: 'api',
      label: 'API & Integrations',
      icon: '🔗',
      description: 'Monitor API usage and integration health'
    },
    {
      id: 'deeds',
      label: 'All Deeds',
      icon: '📄',
      description: 'View and manage all deed documents'
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: '📋',
      description: 'Track all admin actions and system events'
    },
    {
      id: 'revenue',
      label: 'Revenue Analytics',
      icon: '💰',
      description: 'Financial reports and subscription analytics'
    },
    {
      id: 'system',
      label: 'System Health',
      icon: '⚙️',
      description: 'Monitor system performance and maintenance'
    }
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="mb-4">
          <span className="inline-block bg-gradient-to-r from-blue-800 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            🚀 Enterprise Admin Console
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
            DeedPro Admin
          </h1>
          <div className="relative">
            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Platform management & analytics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-blue-800 font-bold text-lg">{stats.total_users.toLocaleString()}</div>
            <div className="text-blue-600 text-xs">Total Users</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-800 font-bold text-lg">{stats.api_calls_today.toLocaleString()}</div>
            <div className="text-green-600 text-xs">API Calls Today</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-purple-800 font-bold text-lg">${stats.monthly_revenue.toLocaleString()}</div>
            <div className="text-purple-600 text-xs">Monthly Revenue</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-800 font-bold text-lg">{stats.system_health}</div>
            <div className="text-orange-600 text-xs">System Health</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className={`font-semibold ${activeTab === item.id ? 'text-white' : 'text-gray-800'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs mt-1 ${activeTab === item.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {item.description}
                    </div>
                  </div>
                  {activeTab === item.id && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
            📧 Send Announcement
          </button>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
            📊 Generate Report
          </button>
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
            🔧 System Check
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <div className="mb-1">DeedPro Admin Console</div>
          <div>v2.0 • Enterprise Edition</div>
        </div>
      </div>
    </div>
  );
} 