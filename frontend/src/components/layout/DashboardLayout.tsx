import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, LayoutDashboard, Globe, Smartphone,
  Activity, Wrench, Settings, BookOpen,
  Lock, Unlock, LogOut, ChevronDown, Menu, X
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Nav items ─────────────────────────────────────────────
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/content-policy', icon: Globe, label: 'Content Policy' },
  { to: '/dashboard/devices', icon: Smartphone, label: 'Device Setup' },
  { to: '/dashboard/activity', icon: Activity, label: 'Activity' },
  { to: '/dashboard/tools', icon: Wrench, label: 'Tools' },
  { to: '/dashboard/config-generator', icon: Settings, label: 'Config Generator' },
]

const bottomNavItems = [
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { to: '/dashboard/guides', icon: BookOpen, label: 'Guides' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isLocked = user?.account?.isLocked ?? false

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {})
    logout()
    navigate('/login')
  }

  const handleLockToggle = async () => {
    if (isLocked) {
      navigate('/dashboard/settings?action=unlock')
    } else {
      await api.post('/account/lock').catch(() => {})
      window.location.reload()
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-background" />
          </div>
          <span className="font-sora font-semibold text-foreground">Noori</span>
        </div>
      </div>

      {/* Lock status badge */}
      <div className="px-4 pt-4">
        <button
          onClick={handleLockToggle}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
            isLocked
              ? 'bg-warning/10 border border-warning/20 text-warning hover:bg-warning/15'
              : 'bg-success/10 border border-success/20 text-success hover:bg-success/15'
          )}
        >
          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
          {isLocked ? 'Profile locked — tap to unlock' : 'Profile unlocked'}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group',
              isActive
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-3 border-t border-border pt-3 space-y-0.5">
        {bottomNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
              isActive
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* User section */}
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-semibold text-amber-500 flex-shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{user?.email}</div>
              <div className="text-xs text-foreground-subtle capitalize">
                {user?.account?.subscription?.plan ?? 'free'} plan
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-foreground-subtle hover:text-danger-text transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-col bg-background-surface border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ─────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-background-surface border-r border-border z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background-surface">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
              <Shield size={12} className="text-background" />
            </div>
            <span className="font-sora font-semibold text-sm text-foreground">Noori</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
