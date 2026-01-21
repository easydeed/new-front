'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import './styles/tokens.css';
import './styles/admin-layout.css';

// Icons as simple SVG components
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  DollarSign: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Icons.Dashboard, href: '/admin-honest-v2' },
  { id: 'users', label: 'Users', icon: Icons.Users, href: '/admin-honest-v2?tab=users' },
  { id: 'deeds', label: 'Deeds', icon: Icons.FileText, href: '/admin-honest-v2?tab=deeds' },
  { id: 'verification', label: 'Verification', icon: Icons.Shield, href: '/admin-honest-v2?tab=verification' },
  { id: 'revenue', label: 'Revenue', icon: Icons.DollarSign, href: '/admin-honest-v2?tab=revenue' },
  { id: 'system', label: 'System', icon: Icons.Settings, href: '/admin-honest-v2?tab=system' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    // Decode JWT to check role (simple base64 decode of payload)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserEmail(payload.email || '');
      
      // Flexible admin check (case-insensitive, multiple variations)
      const role = (payload.role || '').toLowerCase().trim();
      const isAdminRole = ['admin', 'administrator', 'superadmin', 'super_admin'].includes(role);
      
      if (!isAdminRole) {
        // Not admin - redirect to dashboard
        alert('Admin access required. Your role: ' + (payload.role || 'none'));
        router.push('/dashboard');
        return;
      }
      
      setIsAdmin(true);
    } catch (e) {
      console.error('Token decode error:', e);
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Show loading while checking auth
  if (isAdmin === null) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-logo-icon">D</div>
            <div className="admin-logo-text">
              <span className="admin-logo-title">DeedPro</span>
              <span className="admin-logo-badge">Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          <div className="admin-nav-section">
            <span className="admin-nav-label">Menu</span>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === '/admin-honest-v2' && 
                (item.id === 'overview' ? !window.location.search : 
                 window.location.search.includes(`tab=${item.id}`));
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="admin-nav-section">
            <span className="admin-nav-label">Quick Links</span>
            <Link href="/dashboard" className="admin-nav-item">
              <Icons.Home />
              <span>Back to App</span>
            </Link>
          </div>
        </nav>

        {/* User Section */}
        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-avatar">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-email">{userEmail}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">
            <Icons.LogOut />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
