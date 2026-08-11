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
import { apiFetch } from '@/lib/apiClient';
import { LogoLockup, LogoMark } from '@/components/brand/Logo';
import {
  CalendarClock,
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

/**
 * DASH1 item 6 — THREE GROUPS, BECAUSE THEY ARE THREE KINDS OF VISIT.
 *
 * A flat list of seven says every destination is the same kind of thing.
 * They are not: WORK is where she makes and finds documents, TRACKING is
 * where she checks what other people owe her, and SETUP is where she
 * goes twice a year. Grouping is not decoration — it tells her where to
 * look before she has read the labels.
 *
 * `badge` names which count from `/dashboard/queue` rides on the item.
 * Ambient waiting-signal does more for at-a-glance awareness than
 * anything the dashboard carried before this ticket, because she sees it
 * from every page rather than only from the one she starts on.
 */
type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: 'signings' | 'shared_deeds';
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Work',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/deed-builder', icon: FilePlus2, label: 'Create Deed' },
      { href: '/past-deeds', icon: Files, label: 'Past Deeds' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      // NOTARY2 Part D. A page nothing links to is a page nobody uses —
      // the agenda's whole job is being the place she checks what is
      // stuck, and that only works if it is one click from everywhere.
      { href: '/signings', icon: CalendarClock, label: 'Signings', badge: 'signings' },
      { href: '/shared-deeds', icon: Share2, label: 'Shared Deeds', badge: 'shared_deeds' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/partners', icon: Users, label: 'Partners' },
      { href: '/account-settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const ADMIN_ITEM = { href: '/admin', icon: ShieldCheck, label: 'Admin' };

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  /**
   * DASH1 item 6 — the ambient waiting-signal.
   *
   * Best-effort and SILENT on failure, which is the opposite of the rule
   * everywhere else in this codebase and is deliberate: a badge is an
   * enrichment, not a claim. A missing badge says nothing; an error
   * banner in the navigation of every page, because one background
   * request failed, would be noise she cannot act on and cannot dismiss.
   * The pages themselves report their own failures loudly.
   */
  const [badges, setBadges] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) return;
    (async () => {
      try {
        const res = await apiFetch('/dashboard/queue', {}, {
          label: 'Loading waiting counts', silent: true,
        });
        if (res.ok) setBadges((await res.json())?.badges ?? null);
      } catch {
        // See above: a badge that cannot load is a badge that is absent.
      }
    })();
  }, []);

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

  const groups = isAdmin
    ? [...NAV_GROUPS, { title: 'Admin', items: [ADMIN_ITEM] }]
    : NAV_GROUPS;

  const navItem = (item: NavItem, collapsed: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const count = item.badge ? badges?.[item.badge] ?? 0 : 0;
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
          {!collapsed && <span className="truncate flex-1">{item.label}</span>}
          {/* The badge counts what is WAITING, not what exists. Zero
              renders nothing rather than a "0" — a badge saying zero is
              a thing to read that says there is nothing to read. */}
          {count > 0 && (
            <span
              className={`shrink-0 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold ${
                collapsed ? 'absolute top-1 right-1 px-1.5' : 'px-2 py-0.5'
              }`}
              aria-label={`${count} waiting`}
            >
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const navList = (collapsed: boolean) => (
    <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Primary">
      {groups.map((group) => (
        <div key={group.title} className="mb-4 last:mb-0">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group.title}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => navItem(item, collapsed))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (collapsed: boolean) => (
    <div
      className={`flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      {collapsed ? (
        <LogoMark size={30} />
      ) : (
        <LogoLockup size={30} />
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
