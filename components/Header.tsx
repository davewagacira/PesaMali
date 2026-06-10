'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from './Icons'
import { NotificationsBell } from './NotificationsBell'

interface HeaderProps {
  userName: string
  userId: string
}

export default function Header({ userName, userId }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  const profileMenuItems = [
    {
      icon: 'user',
      label: 'Profile',
      action: () => router.push('/profile'),
    },
    {
      icon: 'settings',
      label: 'Settings',
      action: () => router.push('/settings'),
    },
    {
      icon: 'helpCircle',
      label: 'Help & Support',
      action: () => alert('Help & Support coming soon'),
    },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--card)] shadow-sm">
      <div className="mx-auto flex h-16 max-w-full items-center justify-between px-6">
        {/* Left: Branding/Logo */}
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-[var(--text)]">Akiba</div>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-4">
          {userId && <NotificationsBell userId={userId} />}

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-[var(--bg)]"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] flex items-center justify-center text-white font-semibold text-sm">
                {userName ? userName[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-[var(--text)]">{userName || 'User'}</span>
                <span className="text-xs text-[var(--muted)]">Personal plan</span>
              </div>
              <span className="text-[var(--muted)]">
                <I n="chevronDown" size={16} />
              </span>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <motion.div
                    className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Profile Header */}
                    <div className="border-b border-[var(--line)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] flex items-center justify-center text-white font-semibold">
                          {userName ? userName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[var(--text)]">{userName}</h3>
                          <p className="text-xs text-[var(--muted)]">Personal plan</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {profileMenuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            item.action()
                            setIsProfileOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] transition hover:bg-[var(--bg)]"
                        >
                          <I n={item.icon} size={16} />
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[var(--line)]" />

                    {/* Logout */}
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsProfileOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--red)] transition hover:bg-[var(--red-soft)]"
                    >
                      <I n="logout" size={16} />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
