'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { I } from './Icons'

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Akiba" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
        <div className="sidebar-brand-copy">
          <span>Akiba</span>
          <small>Smart money moves.</small>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((n) => {
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
        })}
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
      <div className="user">
        <div className="avatar">{userName ? userName[0].toUpperCase() : 'U'}</div>
        <div>
          <b>{userName}</b>
          <span>Personal plan</span>
        </div>
        <button
          style={{ marginLeft: 'auto', color: 'var(--muted)' }}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <I n="logout" size={16} />
        </button>
      </div>
    </aside>
  )
}
