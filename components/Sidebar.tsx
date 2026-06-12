'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { I } from './Icons'
import { Skeleton } from './Skeleton'
import { useState, useEffect } from 'react'

const PROFILE_TYPE_LABELS: Record<string, string> = {
  budget: '🎓 Budget',
  personal: '💼 My Money',
  business: '🚀 Business',
  savings: '💎 Savings',
}

interface SidebarProps {
  userName: string
  theme: string
  onThemeToggle: () => void
  drawerOpen?: boolean
  onDrawerChange?: (open: boolean) => void
  profileName?: string
  profileAvatar?: string
  profileColor?: string
  profileType?: string
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { id: 'log', label: 'Log expense', icon: 'plusCircle', href: '/log' },
  { id: 'wishlist', label: 'Wishlist', icon: 'target', href: '/wishlist' },
  { id: 'ai', label: 'AI Coach', icon: 'bot', href: '/ai' },
  { id: 'analytics', label: 'Analytics', icon: 'chart', href: '/analytics' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy', href: '/achievements' },
  { id: 'settings', label: 'Budget & settings', icon: 'settings', href: '/settings' },
]

function SidebarContent({
  userName, theme, onThemeToggle, onNav,
  profileName, profileAvatar, profileColor, profileType,
}: {
  userName: string; theme: string; onThemeToggle: () => void; onNav: () => void
  profileName?: string; profileAvatar?: string; profileColor?: string; profileType?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoading = !userName
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleSwitchProfile = () => {
    onNav()
    router.push('/profiles')
  }

  return (
    <>
      <div className="brand">
        {isLoading ? (
          <Skeleton width={36} height={36} style={{ borderRadius: 11, flexShrink: 0 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="PesaMali" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div className="sidebar-brand-copy">
          {isLoading ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton height={16} width={60} />
              <Skeleton height={12} width={80} />
            </div>
          ) : (
            <>
              <span>PesaMali</span>
              <small>Smart money moves.</small>
            </>
          )}
        </div>
      </div>



      <nav className="nav">
        {isLoading ? (
          // Skeleton nav items
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="nav-item opacity-50 cursor-default">
              <div className="w-5 h-5 rounded bg-[var(--line)] animate-pulse" />
              <div className="h-4 w-24 rounded bg-[var(--line)] animate-pulse" />
            </div>
          ))
        ) : (
          NAV.map((n) => {
            const isActive = pathname === n.href || pathname.startsWith(n.href + '/')
            return (
              <button
                key={n.id}
                className={'nav-item' + (isActive ? ' active' : '')}
                onClick={() => {
                  router.push(n.href)
                  onNav()
                }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="navpill"
                      className="nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                </AnimatePresence>
                <I n={n.icon} />
                <span className="txt">{n.label}</span>
              </button>
            )
          })
        )}
      </nav>
      <div className="theme-row">
        <span>
          <I n={theme === 'light' ? 'sun' : 'moon'} size={15} />
          <span>{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>
        </span>
        <button
          className={'switch' + (theme === 'dark' ? ' on' : '')}
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          <motion.span
            className="knob"
            animate={{ x: theme === 'dark' ? 18 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>
      </div>

      <button className="nav-item" onClick={() => setShowLogoutConfirm(true)}>
        <I n="logout" />
        <span className="txt">Log out</span>
      </button>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 z-[200] grid place-items-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)] mx-4"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-lg font-bold text-[var(--text)]">Log out?</h2>
              <p className="mb-6 text-sm text-[var(--muted)]">Are you sure you want to log out of PesaMali?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-[11px] border border-[var(--line)] bg-[var(--card-2)] py-2.5 font-semibold text-[var(--muted)] transition hover:bg-[var(--bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
                    try { localStorage.clear() } catch {}
                    window.location.href = '/'
                  }}
                  className="flex-1 rounded-[11px] bg-[var(--red)] py-2.5 font-semibold text-white transition active:scale-95"
                >
                  Log out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function Sidebar({ userName, theme, onThemeToggle, drawerOpen: controlledDrawerOpen, onDrawerChange, profileName, profileAvatar, profileColor, profileType }: SidebarProps) {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false)
  const drawerOpen = controlledDrawerOpen ?? internalDrawerOpen
  const setDrawerOpen = onDrawerChange ?? setInternalDrawerOpen

  return (
    <>
      {/* Desktop sidebar — always visible at 769px+ */}
      <aside className="sidebar">
        <SidebarContent
          userName={userName}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onNav={() => {}}
          profileName={profileName}
          profileAvatar={profileAvatar}
          profileColor={profileColor}
          profileType={profileType}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer panel */}
            <motion.aside
              className="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <I n="x" size={20} />
              </button>
              <SidebarContent
                userName={userName}
                theme={theme}
                onThemeToggle={onThemeToggle}
                onNav={() => setDrawerOpen(false)}
                profileName={profileName}
                profileAvatar={profileAvatar}
                profileColor={profileColor}
                profileType={profileType}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
