'use client';

// F6: visual re-implementation from the V0 reference (temp-v0, reference
// only — not merged). Logic contracts preserved: nav items and hrefs,
// AuthManager.isAdmin() gating, AuthManager.logout(), collapse/expand.
// Fixed by design: the active accent now renders (the old `border-l-3`
// class doesn't exist in Tailwind), active matching is exact-plus-subroute
// instead of bare startsWith, and mobile gets an off-canvas drawer.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { AuthManager } from '../utils/auth';
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Share2,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/deed-builder', icon: FilePlus2, label: 'Create Deed' },
  { href: '/past-deeds', icon: Files, label: 'Past Deeds' },
  { href: '/shared-deeds', icon: Share2, label: 'Shared Deeds' },
  { href: '/partners', icon: Users, label: 'Partners' },
  { href: '/account-settings', icon: Settings, label: 'Settings' },
];

const ADMIN_ITEM = { href: '/admin', icon: ShieldCheck, label: 'Admin' };

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status on mount (localStorage isn't available during SSR)
  useEffect(() => {
    setIsAdmin(AuthManager.isAdmin());
  }, []);

  const handleLogout = () => {
    AuthManager.logout();
    window.location.href = '/login';
  };

  // Active = exact match or a sub-route of the item (so /deed-builder/grant-deed
  // keeps Create Deed lit without the old prefix over-matching).
  const isActive = (href: string) =>
    pathname === href || !!pathname?.startsWith(`${href}/`);

  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  const navList = (collapsed: boolean) => (
    <ul className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-500 transition-opacity ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden="true"
              />
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const brand = (collapsed: boolean) => (
    <div
      className={`flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      <span className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-5 h-5 text-white" />
      </span>
      {!collapsed && (
        <span className="text-xl font-bold tracking-tight text-gray-900">DeedPro</span>
      )}
    </div>
  );

  const logoutButton = (collapsed: boolean) => (
    <div className="px-3 py-4 border-t border-gray-100">
      <button
        onClick={handleLogout}
        title={collapsed ? 'Logout' : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 transition-colors w-full ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile: floating menu button (pages lay Sidebar + main in a flex
          row, so a fixed trigger avoids reflowing every page on mobile) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-40 p-2.5 rounded-full bg-white border border-gray-200 shadow-md text-gray-600 hover:text-brand-500 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile off-canvas overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile off-canvas drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pr-3">
          {brand(false)}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {navList(false)}
        {logoutButton(false)}
      </aside>

      {/* Desktop sidebar (collapsible icon rail) */}
      <nav
        className={`hidden md:flex md:flex-col bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="relative">
          {brand(isCollapsed)}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-brand-500 hover:border-brand-500 transition-colors z-10"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {navList(isCollapsed)}
        {logoutButton(isCollapsed)}
      </nav>
    </>
  );
}
