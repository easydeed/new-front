"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthManager } from "../utils/auth"
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
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create-deed", label: "Create Deed", icon: FilePlus2 },
  { href: "/past-deeds", label: "Past Deeds", icon: Files },
  { href: "/shared-deeds", label: "Shared Deeds", icon: Share2 },
  { href: "/partners", label: "Partners", icon: Users },
  { href: "/account-settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)

  // Resolve admin visibility on the client (localStorage isn't available during SSR).
  React.useEffect(() => {
    const user = AuthManager.getUser()
    setIsAdmin(Boolean(user?.is_admin || user?.isAdmin || user?.role === "admin"))
  }, [])

  const handleLogout = () => {
    AuthManager.logout()
  }

  // Exact-match active logic.
  const isActive = (href: string) => pathname === href

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  const NavList = ({ collapsed }: { collapsed: boolean }) => (
    <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-[#7C4DFF]/10 text-[#7C4DFF]"
                : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1F2B37]"
            }`}
          >
            {/* Real active accent bar */}
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#7C4DFF] transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#7C4DFF]" : ""}`} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )

  const Brand = ({ collapsed }: { collapsed: boolean }) => (
    <div className={`flex items-center gap-2.5 px-5 py-5 border-b border-[#F0F0F2] ${collapsed ? "justify-center px-0" : ""}`}>
      <span className="w-9 h-9 rounded-lg bg-[#7C4DFF] flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-5 h-5 text-white" />
      </span>
      {!collapsed && <span className="text-xl font-bold tracking-tight text-[#1F2B37]">DeedPro</span>}
    </div>
  )

  const LogoutButton = ({ collapsed }: { collapsed: boolean }) => (
    <div className="px-3 py-4 border-t border-[#F0F0F2]">
      <button
        onClick={handleLogout}
        title={collapsed ? "Logout" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#DC2626] hover:bg-[#EF4444]/10 transition-colors w-full ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Logout</span>}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-[#E5E7EB] px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#7C4DFF] flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1F2B37]">DeedPro</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile off-canvas overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile off-canvas drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div className="flex items-center justify-between border-b border-[#F0F0F2] pr-3">
          <Brand collapsed={false} />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <NavList collapsed={false} />
        <LogoutButton collapsed={false} />
      </aside>

      {/* Desktop sidebar (collapsible icon rail) */}
      <aside
        className={`hidden md:flex md:flex-col bg-white border-r border-[#E5E7EB] h-screen sticky top-0 transition-[width] duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="relative">
          <Brand collapsed={isCollapsed} />
          {/* Collapse / expand toggle */}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#7C4DFF] hover:border-[#7C4DFF] transition-colors z-10"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <NavList collapsed={isCollapsed} />
        <LogoutButton collapsed={isCollapsed} />
      </aside>
    </>
  )
}
