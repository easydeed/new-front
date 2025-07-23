'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import '../../styles/dashboard.css';

interface AdminStats {
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
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  subscription_plan: string;
  subscription_status: string;
  total_deeds: number;
  monthly_revenue: number;
  created_at: string;
  last_login: string;
  is_active: boolean;
  api_key?: string;
  api_calls_this_month: number;
  integrations: string[];
  company?: string;
  role?: string;
}

interface Deed {
  id: number;
  user_email: string;
  user_name: string;
  deed_type: string;
  property_address: string;
  status: string;
  created_at: string;
  shared_count: number;
  approval_count: number;
  ai_assistance_used: boolean;
  api_generated: boolean;
  integration_source?: string;
}

interface ApiUsage {
  user_id: number;
  user_email: string;
  endpoint: string;
  calls_today: number;
  calls_month: number;
  last_call: string;
  status: string;
}

interface Integration {
  id: number;
  name: string;
  type: 'softpro' | 'qualia' | 'custom';
  status: string;
  users_count: number;
  calls_today: number;
  last_sync: string;
  webhook_url?: string;
}

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  details: string;
  success: boolean;
}

interface Notification {
  id: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
}

interface SystemMetric {
  timestamp: string;
  api_calls: number;
  response_time: number;
  error_rate: number;
  active_users: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    active_users: 0,
    total_deeds: 0,
    deeds_this_month: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    api_calls_today: 0,
    api_calls_month: 0,
    system_health: 'healthy',
    active_integrations: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls to admin endpoints
    setTimeout(() => {
      setStats({
        total_users: 1247,
        active_users: 892,
        total_deeds: 3456,
        deeds_this_month: 234,
        total_revenue: 45230.50,
        monthly_revenue: 8750.25,
        api_calls_today: 15420,
        api_calls_month: 284750,
        system_health: 'healthy',
        active_integrations: 156
      });

      setUsers([
        {
          id: 1,
          email: "john@example.com",
          first_name: "John",
          last_name: "Doe",
          subscription_plan: "enterprise",
          subscription_status: "active",
          total_deeds: 45,
          monthly_revenue: 299.99,
          created_at: "2024-01-01",
          last_login: "2024-01-15",
          is_active: true,
          api_key: "dp_live_123456789",
          api_calls_this_month: 2847,
          integrations: ["SoftPro 360", "Qualia"],
          company: "ABC Title Company",
          role: "Escrow Officer"
        },
        {
          id: 2,
          email: "jane@company.com",
          first_name: "Jane",
          last_name: "Smith",
          subscription_plan: "professional",
          subscription_status: "active",
          total_deeds: 23,
          monthly_revenue: 89.99,
          created_at: "2024-01-05",
          last_login: "2024-01-14",
          is_active: true,
          api_key: "dp_live_987654321",
          api_calls_this_month: 156,
          integrations: ["SoftPro 360"],
          company: "Smith Real Estate",
          role: "Real Estate Agent"
        },
        {
          id: 3,
          email: "bob@firm.com",
          first_name: "Bob",
          last_name: "Wilson",
          subscription_plan: "starter",
          subscription_status: "active",
          total_deeds: 8,
          monthly_revenue: 29.99,
          created_at: "2024-01-10",
          last_login: "2024-01-13",
          is_active: true,
          api_calls_this_month: 0,
          integrations: [],
          company: "Wilson Law Firm",
          role: "Attorney"
        }
      ]);

      setDeeds([
        {
          id: 1,
          user_email: "john@example.com",
          user_name: "John Doe",
          deed_type: "Quitclaim Deed",
          property_address: "123 Main St, Los Angeles, CA",
          status: "completed",
          created_at: "2024-01-10",
          shared_count: 2,
          approval_count: 1,
          ai_assistance_used: true,
          api_generated: true,
          integration_source: "SoftPro 360"
        },
        {
          id: 2,
          user_email: "jane@company.com",
          user_name: "Jane Smith",
          deed_type: "Grant Deed",
          property_address: "456 Oak Ave, Beverly Hills, CA",
          status: "draft",
          created_at: "2024-01-14",
          shared_count: 0,
          approval_count: 0,
          ai_assistance_used: true,
          api_generated: false
        }
      ]);

      setApiUsage([
        {
          user_id: 1,
          user_email: "john@example.com",
          endpoint: "/api/v1/softpro/webhook",
          calls_today: 45,
          calls_month: 2847,
          last_call: "2024-01-15T10:30:00Z",
          status: "active"
        },
        {
          user_id: 1,
          user_email: "john@example.com",
          endpoint: "/api/v1/qualia/graphql",
          calls_today: 23,
          calls_month: 1567,
          last_call: "2024-01-15T09:15:00Z",
          status: "active"
        },
        {
          user_id: 2,
          user_email: "jane@company.com",
          endpoint: "/api/v1/softpro/webhook",
          calls_today: 12,
          calls_month: 156,
          last_call: "2024-01-15T08:45:00Z",
          status: "active"
        }
      ]);

      setIntegrations([
        {
          id: 1,
          name: "SoftPro 360",
          type: "softpro",
          status: "active",
          users_count: 89,
          calls_today: 1247,
          last_sync: "2024-01-15T10:30:00Z",
          webhook_url: "https://api.deedpro.io/webhooks/softpro"
        },
        {
          id: 2,
          name: "Qualia",
          type: "qualia",
          status: "active",
          users_count: 67,
          calls_today: 892,
          last_sync: "2024-01-15T09:15:00Z"
        }
      ]);

      setAuditLogs([
        {
          id: 1,
          user_email: "admin@deedpro.com",
          action: "USER_LOGIN",
          resource: "Admin Dashboard",
          timestamp: "2024-01-15T10:30:00Z",
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          details: "Admin user logged into dashboard",
          success: true
        },
        {
          id: 2,
          user_email: "john@example.com",
          action: "API_KEY_GENERATED",
          resource: "API Management",
          timestamp: "2024-01-15T09:45:00Z",
          ip_address: "192.168.1.101",
          user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          details: "New API key generated for Enterprise plan",
          success: true
        },
        {
          id: 3,
          user_email: "jane@company.com",
          action: "DEED_CREATED",
          resource: "Deed Management",
          timestamp: "2024-01-15T09:30:00Z",
          ip_address: "192.168.1.102",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          details: "Grant deed created via API integration",
          success: true
        }
      ]);

      setNotifications([
        {
          id: 1,
          type: "warning",
          title: "High API Usage",
          message: "API calls are 20% above normal for this time of day",
          timestamp: "2024-01-15T10:15:00Z",
          read: false,
          action_url: "/admin?tab=api"
        },
        {
          id: 2,
          type: "success",
          title: "System Backup Complete",
          message: "Daily backup completed successfully at 2:00 AM",
          timestamp: "2024-01-15T02:00:00Z",
          read: true
        },
        {
          id: 3,
          type: "info",
          title: "New User Registration",
          message: "5 new users registered in the last hour",
          timestamp: "2024-01-15T09:30:00Z",
          read: false,
          action_url: "/admin?tab=users"
        }
      ]);

      setSystemMetrics([
        { timestamp: "2024-01-15T06:00:00Z", api_calls: 1200, response_time: 45, error_rate: 0.01, active_users: 234 },
        { timestamp: "2024-01-15T07:00:00Z", api_calls: 1450, response_time: 42, error_rate: 0.02, active_users: 289 },
        { timestamp: "2024-01-15T08:00:00Z", api_calls: 1680, response_time: 48, error_rate: 0.01, active_users: 345 },
        { timestamp: "2024-01-15T09:00:00Z", api_calls: 1920, response_time: 44, error_rate: 0.01, active_users: 412 },
        { timestamp: "2024-01-15T10:00:00Z", api_calls: 2150, response_time: 46, error_rate: 0.02, active_users: 467 }
      ]);

      setLoading(false);
    }, 1000);
  }, []);

  const tabStyle = (isActive: boolean) => ({
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    backgroundColor: isActive ? '#6A49F2' : '#f8f9fa',
    color: isActive ? 'white' : '#6c757d',
    marginRight: '0.25rem'
  });

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '2rem',
    margin: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  const statCardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'center' as const,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '1rem'
  };

  const thStyle = {
    backgroundColor: '#1e3a8a',
    color: 'white',
    padding: '1rem',
    textAlign: 'left' as const,
    fontWeight: 'bold'
  };

  const tdStyle = {
    padding: '1rem',
    borderBottom: '1px solid #dee2e6'
  };

  const getStatusBadge = (status: string, isActive?: boolean) => {
    let color = '#6c757d';
    if (status === 'active' || isActive === true) color = '#28a745';
    if (status === 'cancelled' || isActive === false) color = '#dc3545';
    if (status === 'completed') color = '#28a745';
    if (status === 'draft') color = '#ffc107';

    return (
      <span style={{
        backgroundColor: color,
        color: color === '#ffc107' ? '#000' : '#fff',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: 'bold'
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.5rem', color: '#6A49F2' }}>Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} notifications={notifications} />
      
      {/* Main Content */}
      <div className="flex-1 ml-80 overflow-y-auto">
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent mb-2">
              {activeTab === 'overview' && '📊 Dashboard Overview'}
              {activeTab === 'users' && '👥 User Management'}
              {activeTab === 'api' && '🔗 API & Integrations'}
              {activeTab === 'deeds' && '📄 All Deeds'}
              {activeTab === 'audit' && '📋 Audit Logs'}
              {activeTab === 'revenue' && '💰 Revenue Analytics'}
              {activeTab === 'system' && '⚙️ System Health'}
            </h1>
            <p className="text-gray-600">
              {activeTab === 'overview' && 'Comprehensive platform metrics and quick actions'}
              {activeTab === 'users' && 'Manage users, subscriptions, and API access'}
              {activeTab === 'api' && 'Monitor API usage and integration health'}
              {activeTab === 'deeds' && 'View and manage all deed documents'}
              {activeTab === 'audit' && 'Track all admin actions and system events'}
              {activeTab === 'revenue' && 'Financial reports and subscription analytics'}
              {activeTab === 'system' && 'Monitor system performance and maintenance'}
            </p>
          </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">👥 Total Users</h3>
              <div className="text-3xl font-bold text-gray-800">{stats.total_users.toLocaleString()}</div>
              <div className="text-green-600 text-sm">{stats.active_users} active</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">📄 Total Deeds</h3>
              <div className="text-3xl font-bold text-gray-800">{stats.total_deeds.toLocaleString()}</div>
              <div className="text-blue-600 text-sm">{stats.deeds_this_month} this month</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">💰 Total Revenue</h3>
              <div className="text-3xl font-bold text-gray-800">${stats.total_revenue.toLocaleString()}</div>
              <div className="text-green-600 text-sm">${stats.monthly_revenue} this month</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">🔗 API Calls</h3>
              <div className="text-3xl font-bold text-gray-800">{stats.api_calls_today.toLocaleString()}</div>
              <div className="text-blue-600 text-sm">{stats.api_calls_month.toLocaleString()} this month</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">⚙️ System Health</h3>
              <div className="text-3xl font-bold text-green-600">{stats.system_health}</div>
              <div className="text-blue-600 text-sm">99.9% uptime</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h3 className="text-blue-800 font-semibold mb-2">🔗 Integrations</h3>
              <div className="text-3xl font-bold text-gray-800">{stats.active_integrations}</div>
              <div className="text-blue-600 text-sm">SoftPro & Qualia</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h3 className="text-blue-800 font-semibold mb-4 text-lg">🚀 Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                📧 Send Platform Announcement
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                📊 Generate Revenue Report
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                🔄 System Health Check
              </button>
              <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                🔑 Manage API Keys
              </button>
            </div>
          </div>

          {/* Feedback & Support Widget */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-blue-800 font-semibold mb-4 text-lg">💬 Admin Feedback & Support</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-gray-700 font-medium mb-3">Report Issue or Suggest Feature</h4>
                <form className="space-y-4">
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Select Issue Type</option>
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Performance Issue</option>
                    <option>Security Concern</option>
                    <option>User Feedback</option>
                  </select>
                  <textarea 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    rows={4} 
                    placeholder="Describe the issue or feature request in detail..."
                  ></textarea>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium">
                    📤 Submit Feedback
                  </button>
                </form>
              </div>
              <div>
                <h4 className="text-gray-700 font-medium mb-3">Quick Support</h4>
                <div className="space-y-3">
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium text-left">
                    📚 View Documentation
                  </button>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium text-left">
                    💬 Contact Support Team
                  </button>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors font-medium text-left">
                    🎓 Admin Training Resources
                  </button>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800 font-medium">24/7 Emergency Support</div>
                    <div className="text-sm text-blue-600">Call: 1-800-DEEDPRO</div>
                    <div className="text-sm text-blue-600">Email: emergency@deedpro.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ color: '#6A49F2', margin: 0 }}>👥 User Management ({users.length.toLocaleString()} users)</h3>
            <div>
              <input 
                type="text" 
                placeholder="Search users..." 
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  marginRight: '1rem'
                }}
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2">
                <option>All Roles</option>
                <option>Admin</option>
                <option>Viewer</option>
                <option>User</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mr-2">
                📊 Export Users (CSV)
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                📄 User Report (PDF)
              </button>
            </div>
          </div>
          
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>API Usage</th>
                <th style={thStyle}>Integrations</th>
                <th style={thStyle}>Revenue</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={tdStyle}>
                    <strong>{user.first_name} {user.last_name}</strong>
                    <br />
                    <small style={{ color: '#6c757d' }}>{user.company} • {user.role}</small>
                  </td>
                  <td style={tdStyle}>{user.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: user.subscription_plan === 'enterprise' ? '#6f42c1' : user.subscription_plan === 'professional' ? '#17a2b8' : '#6c757d',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      {user.subscription_plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>{getStatusBadge(user.subscription_status)}</td>
                  <td style={tdStyle}>
                    <div>{user.api_calls_this_month} calls</div>
                    <small style={{ color: '#6c757d' }}>{user.api_key ? 'API Key Active' : 'No API Access'}</small>
                  </td>
                  <td style={tdStyle}>
                    {user.integrations.map((integration, idx) => (
                      <span key={idx} style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        marginRight: '0.25rem'
                      }}>
                        {integration}
                      </span>
                    ))}
                  </td>
                  <td style={tdStyle}>${user.monthly_revenue}</td>
                  <td style={tdStyle}>
                    <button style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* API & Integrations Tab */}
      {activeTab === 'api' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>🔗 API Usage Overview</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Total API Calls Today</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                  {stats.api_calls_today.toLocaleString()}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Monthly API Calls</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#17a2b8' }}>
                  {stats.api_calls_month.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Active API Keys</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6A49F2' }}>
                  {users.filter(u => u.api_key).length}
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>🔗 Integration Status</h3>
              {integrations.map(integration => (
                <div key={integration.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{integration.name}</strong>
                    <span style={{
                      backgroundColor: integration.status === 'active' ? '#28a745' : '#dc3545',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      {integration.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                    {integration.users_count} users • {integration.calls_today} calls today
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>📊 API Usage by Endpoint</h3>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Endpoint</th>
                  <th style={thStyle}>Calls Today</th>
                  <th style={thStyle}>Calls Month</th>
                  <th style={thStyle}>Last Call</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {apiUsage.map((usage, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>{usage.user_email}</td>
                    <td style={tdStyle}>
                      <code style={{ backgroundColor: '#f8f9fa', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {usage.endpoint}
                      </code>
                    </td>
                    <td style={tdStyle}>{usage.calls_today}</td>
                    <td style={tdStyle}>{usage.calls_month.toLocaleString()}</td>
                    <td style={tdStyle}>{new Date(usage.last_call).toLocaleString()}</td>
                    <td style={tdStyle}>{getStatusBadge(usage.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deeds Tab */}
      {activeTab === 'deeds' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ color: '#6A49F2', margin: 0 }}>📄 All Deeds ({deeds.length.toLocaleString()} total)</h3>
            <div>
              <select style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #ddd',
                marginRight: '1rem'
              }}>
                <option>All Statuses</option>
                <option>Completed</option>
                <option>Draft</option>
                <option>Pending</option>
              </select>
              <button style={{
                backgroundColor: '#6A49F2',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Export Deeds
              </button>
            </div>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Deed ID</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Property</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>AI/API</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deeds.map(deed => (
                <tr key={deed.id}>
                  <td style={tdStyle}>
                    <strong>#{deed.id}</strong>
                  </td>
                  <td style={tdStyle}>
                    <strong>{deed.user_name}</strong>
                    <br />
                    <small style={{ color: '#6c757d' }}>{deed.user_email}</small>
                  </td>
                  <td style={tdStyle}>{deed.property_address}</td>
                  <td style={tdStyle}>{deed.deed_type}</td>
                  <td style={tdStyle}>{getStatusBadge(deed.status)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {deed.ai_assistance_used && (
                        <span style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          🤖 AI
                        </span>
                      )}
                      {deed.api_generated && (
                        <span style={{ backgroundColor: '#e8f5e8', color: '#2e7d32', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          🔗 API
                        </span>
                      )}
                      {deed.integration_source && (
                        <span style={{ backgroundColor: '#fff3e0', color: '#f57c00', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {deed.integration_source}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>{new Date(deed.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <button style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      View
                    </button>
                    <button style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-blue-800 font-semibold text-lg">📋 Audit Logs ({auditLogs.length.toLocaleString()} total)</h3>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Search actions..." 
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Actions</option>
                  <option>USER_LOGIN</option>
                  <option>API_KEY_GENERATED</option>
                  <option>DEED_CREATED</option>
                  <option>SYSTEM_CONFIG</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Export Logs
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold">User</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                    <th className="px-4 py-3 text-left font-semibold">Resource</th>
                    <th className="px-4 py-3 text-left font-semibold">IP Address</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{log.resource}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.ip_address}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h4 className="text-blue-800 font-semibold mb-2">📊 Total Actions</h4>
              <div className="text-2xl font-bold text-gray-800">{auditLogs.length}</div>
              <div className="text-green-600 text-sm">Last 24 hours</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h4 className="text-blue-800 font-semibold mb-2">👥 Unique Users</h4>
              <div className="text-2xl font-bold text-gray-800">
                {new Set(auditLogs.map(log => log.user_email)).size}
              </div>
              <div className="text-blue-600 text-sm">Active today</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h4 className="text-blue-800 font-semibold mb-2">✅ Success Rate</h4>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((auditLogs.filter(log => log.success).length / auditLogs.length) * 100)}%
              </div>
              <div className="text-green-600 text-sm">All actions</div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <h4 className="text-blue-800 font-semibold mb-2">🌍 IP Addresses</h4>
              <div className="text-2xl font-bold text-gray-800">
                {new Set(auditLogs.map(log => log.ip_address)).size}
              </div>
              <div className="text-blue-600 text-sm">Unique locations</div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>💰 Revenue Overview</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Total Revenue</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                  ${stats.total_revenue.toLocaleString()}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Monthly Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#17a2b8' }}>
                  ${stats.monthly_revenue.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Average per User</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6A49F2' }}>
                  ${(stats.total_revenue / stats.total_users).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>📊 Subscription Breakdown</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Enterprise API</span>
                  <span style={{ fontWeight: 'bold' }}>268 users</span>
                </div>
                <div style={{ backgroundColor: '#6f42c1', height: '8px', borderRadius: '4px', marginBottom: '1rem' }}></div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Professional</span>
                  <span style={{ fontWeight: 'bold' }}>523 users</span>
                </div>
                <div style={{ backgroundColor: '#17a2b8', height: '8px', borderRadius: '4px', marginBottom: '1rem' }}></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Starter</span>
                  <span style={{ fontWeight: 'bold' }}>456 users</span>
                </div>
                <div style={{ backgroundColor: '#6c757d', height: '8px', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>🏆 Top Revenue Generators</h3>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Total Paid</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>🥇 1</td>
                  <td style={tdStyle}>john@example.com</td>
                  <td style={tdStyle}><strong>$359.88</strong></td>
                  <td style={tdStyle}>{getStatusBadge('enterprise')}</td>
                  <td style={tdStyle}>
                    <button style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      View Profile
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>🥈 2</td>
                  <td style={tdStyle}>sarah@lawfirm.com</td>
                  <td style={tdStyle}><strong>$299.88</strong></td>
                  <td style={tdStyle}>{getStatusBadge('enterprise')}</td>
                  <td style={tdStyle}>
                    <button style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      View Profile
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>🥉 3</td>
                  <td style={tdStyle}>mike@realty.com</td>
                  <td style={tdStyle}><strong>$239.91</strong></td>
                  <td style={tdStyle}>{getStatusBadge('professional')}</td>
                  <td style={tdStyle}>
                    <button style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}>
                      View Profile
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === 'system' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>⚙️ System Status</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>Main API</span>
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Healthy</span>
                </div>
                <div style={{ backgroundColor: '#28a745', height: '8px', borderRadius: '4px', marginBottom: '1rem' }}></div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>External API</span>
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Healthy</span>
                </div>
                <div style={{ backgroundColor: '#28a745', height: '8px', borderRadius: '4px', marginBottom: '1rem' }}></div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>Database</span>
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Healthy</span>
                </div>
                <div style={{ backgroundColor: '#28a745', height: '8px', borderRadius: '4px', marginBottom: '1rem' }}></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span>AI Services</span>
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ Healthy</span>
                </div>
                <div style={{ backgroundColor: '#28a745', height: '8px', borderRadius: '4px' }}></div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ color: '#6A49F2', marginBottom: '1rem' }}>📊 Performance Metrics</h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Uptime</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>99.9%</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Response Time</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#17a2b8' }}>45ms</div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Error Rate</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#6A49F2' }}>0.01%</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <h3 className="text-blue-800 font-semibold mb-4 text-lg">📈 Performance Benchmarks</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-gray-700 font-medium mb-3">API Calls Trend (Last 5 Hours)</h4>
                <div className="space-y-2">
                  {systemMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center flex-1 mx-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(metric.api_calls / 2500) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 ml-2">
                          {metric.api_calls}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-gray-700 font-medium mb-3">Response Time Trend (ms)</h4>
                <div className="space-y-2">
                  {systemMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center flex-1 mx-4">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(metric.response_time / 100) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 ml-2">
                          {metric.response_time}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-3 justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                📊 Export Performance Report (PDF)
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                📈 Export Metrics (CSV)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-blue-800 font-semibold mb-4 text-lg">🔧 System Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                🔄 Restart Services
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                📊 View Logs
              </button>
              <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                🔧 Maintenance Mode
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                🚨 Emergency Stop
              </button>
            </div>
          </div>

          {/* Backup & Recovery Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mt-6">
            <h3 className="text-blue-800 font-semibold mb-4 text-lg">💾 Backup & Recovery</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-gray-700 font-medium mb-3">Recent Backups</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">Daily Backup</div>
                      <div className="text-sm text-gray-600">Today 2:00 AM • 2.3 GB</div>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      ✅ Success
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">Weekly Backup</div>
                      <div className="text-sm text-gray-600">Jan 14 2:00 AM • 2.1 GB</div>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      ✅ Success
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-gray-700 font-medium mb-3">Backup Actions</h4>
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                    💾 Create Manual Backup
                  </button>
                  <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                    🔄 Restore from Backup
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                    📋 View Backup Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
} 