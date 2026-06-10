'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { I } from './Icons'
import { Skeleton } from './Skeleton'
import { useState, useEffect } from 'react'

interface SidebarProps {
  userName: string
  theme: string
  onThemeToggle: () => void
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { id: 'log', label: 'Log expense', icon: 'plusCircle', href: '/log' },
  { id: 'analytics', label: 'Analytics', icon: 'chart', href: '/analytics' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy', href: '/achievements' },
  { id: 'ai', label: 'Akiba AI', icon: 'sparkles', href: '/ai' },
  { id: 'settings', label: 'Budget & settings', icon: 'settings', href: '/settings' },
]

export default function Sidebar({ userName, theme, onThemeToggle }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    try { localStorage.clear() } catch {}
    router.replace('/')
    router.refresh()
  }

  const isLoading = !userName

  return (
    <aside className="sidebar relative z-50">
      <div className="brand">
        {isLoading ? (
          <Skeleton width={36} height={36} style={{ borderRadius: 11, flexShrink: 0 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Akiba" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div className="sidebar-brand-copy">
          {isLoading ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton height={16} width={60} />
              <Skeleton height={12} width={80} />
            </div>
          ) : (
            <>
              <span>Akiba</span>
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
                onClick={() => router.push(n.href)}
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

      <button className="nav-item" onClick={handleLogout}>
        <I n="logout" />
        <span className="txt">Log out</span>
      </button>
    </>
  )
}

function SidebarContent({ userName, theme, onThemeToggle, onNav }: { userName: string; theme: string; onThemeToggle: () => void; onNav: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoading = !userName

  return (
    <>
      <div className="brand">
        {isLoading ? (
          <Skeleton width={36} height={36} style={{ borderRadius: 11, flexShrink: 0 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Akiba" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div className="sidebar-brand-copy">
          {isLoading ? (
            <div className="flex flex-col gap-1.5">
              <Skeleton height={16} width={60} />
              <Skeleton height={12} width={80} />
            </div>
          ) : (
            <>
              <span>Akiba</span>
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

      <button className="nav-item" onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); try { localStorage.clear() } catch {}; router.replace('/'); router.refresh(); }}>
        <I n="logout" />
        <span className="txt">Log out</span>
      </button>
    </>
  )
}

export default function Sidebar({ userName, theme, onThemeToggle }: SidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — always visible at 769px+ */}
      <aside className="sidebar">
        <SidebarContent
          userName={userName}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onNav={() => {}}
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
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
