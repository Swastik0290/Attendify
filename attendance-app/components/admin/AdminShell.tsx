'use client'

import { useState, useEffect, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  /** Lucide icon component */
  icon: React.ElementType
  /** If true, only exact pathname match is active */
  exact?: boolean
}

// ─── Navigation Items ─────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/admin/faculty',
    label: 'Faculty',
    icon: Users,
  },
  {
    href: '/admin/students',
    label: 'Students & Roster',
    icon: GraduationCap,
  },
  {
    href: '/admin/subjects',
    label: 'Subjects',
    icon: BookOpen,
  },
  {
    href: '/admin/sessions',
    label: 'Attendance Sessions',
    icon: CalendarCheck,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
  },
]

// ─── AdminShell ───────────────────────────────────────────────────────────────

interface AdminShellProps {
  children: React.ReactNode
}

/**
 * Top-level admin layout shell.
 *
 * Renders:
 *   - Fixed desktop sidebar (≥ lg breakpoint)
 *   - Slide-in mobile drawer (< lg breakpoint) with backdrop
 *   - Sticky top header bar with breadcrumb context
 *   - Main page content area
 *
 * Authentication and role verification are NOT implemented here.
 * They will be added in a future milestone.
 */
export function AdminShell({ children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()

  // Lock / unlock body scroll when mobile nav is open.
  // This is a legitimate DOM side-effect (updating an external system).
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  const closeNav = () => setMobileNavOpen(false)
  const openNav = () => setMobileNavOpen(true)

  const isActive = (item: NavItem): boolean =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const currentLabel =
    NAV_ITEMS.find((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    )?.label ?? 'Dashboard'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col bg-slate-900"
        aria-label="Admin navigation"
      >
        {/* Identity */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shield className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">
              AttendanceIQ
            </p>
            <p className="text-[10px] leading-tight text-slate-400">
              Administration
            </p>
          </div>
        </div>

        {/* Nav: desktop never needs to close the drawer on click */}
        <NavList navItems={NAV_ITEMS} isActive={isActive} onItemClick={undefined} />
        <SidebarFooter />
      </aside>

      {/* ── Mobile: Backdrop ───────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden',
          mobileNavOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={closeNav}
        aria-hidden="true"
      />

      {/* ── Mobile: Slide-in Drawer ────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900',
          'transition-transform duration-200 ease-out lg:hidden',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Admin navigation"
        aria-modal="true"
        role="dialog"
      >
        {/* Drawer header: identity + close button */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <Shield className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                AttendanceIQ
              </p>
              <p className="text-[10px] leading-tight text-slate-400">
                Administration
              </p>
            </div>
          </div>
          <button
            onClick={closeNav}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav: mobile closes drawer when a link is tapped */}
        <NavList navItems={NAV_ITEMS} isActive={isActive} onItemClick={closeNav} />
        <SidebarFooter />
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-col lg:pl-64">

        {/* Sticky header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">

          {/* Mobile: hamburger */}
          <button
            onClick={openNav}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <Shield
              className="h-3.5 w-3.5 shrink-0 text-blue-600"
              aria-hidden="true"
            />
            <span className="hidden shrink-0 text-slate-400 sm:block">
              Administration
            </span>
            <ChevronRight
              className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block"
              aria-hidden="true"
            />
            <span className="truncate font-medium text-slate-800">
              {currentLabel}
            </span>
          </div>

          {/* Right side */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200 md:inline-block">
              Super Admin
            </span>
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── NavList ──────────────────────────────────────────────────────────────────

function NavList({
  navItems,
  isActive,
  onItemClick,
}: {
  navItems: NavItem[]
  isActive: (item: NavItem) => boolean
  onItemClick: (() => void) | undefined
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Management
      </p>
      <ul className="space-y-0.5" role="list">
        {navItems.map((item) => {
          const active = isActive(item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onItemClick}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                )}
              >
                {/* Active left-edge indicator */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500"
                  />
                )}
                <item.icon
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active
                      ? 'text-blue-400'
                      : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// ─── SidebarFooter ────────────────────────────────────────────────────────────

function SidebarFooter() {
  return (
    <div className="shrink-0 border-t border-slate-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
          SA
        </div>
        <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">Super Admin</p>
            <p className="truncate text-[10px] text-slate-400">
              superadmin@attendanceiq.test
            </p>
          </div>
      </div>
    </div>
  )
}

// ─── SignOutButton ─────────────────────────────────────────────────────────────

function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      const { signOut } = await import('@/lib/actions')
      await signOut()
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 min-h-[40px] disabled:opacity-50"
      title="Sign out"
      type="button"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{isPending ? 'Signing out...' : 'Sign out'}</span>
    </button>
  )
}
