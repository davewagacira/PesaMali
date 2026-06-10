'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from './Icons'
import { NotificationsBell } from './NotificationsBell'

interface HeaderProps {
  userName: string
  userId: string
  onMenuClick: () => void
}

export default function Header({ userName, userId, onMenuClick }: HeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--card)] shadow-sm w-full">
        <div className="flex h-12 md:h-16 w-full items-center justify-between px-3 md:px-6">
          {/* Hamburger — mobile only */}
          <button
            className="flex md:hidden items-center justify-center rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] min-h-[44px] min-w-[44px]"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <I n="menu" size={22} />
          </button>
          {/* Right: Notifications + Logout */}
          <div className="flex items-center gap-2 md:gap-4">
            {userId && <NotificationsBell userId={userId} />}

            <div className="flex items-center gap-2 md:gap-3">
              {userName ? (
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#7C3AED] flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0">
                  {userName[0].toUpperCase()}
                </div>
              ) : (
                <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-[var(--line)] animate-pulse flex-shrink-0" />
              )}
              <div className="hidden md:flex flex-col items-start">
                {userName ? (
                  <>
                    <span className="text-sm font-semibold text-[var(--text)]">{userName}</span>
                    <span className="text-xs text-[var(--muted)]">Personal plan</span>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-24 rounded bg-[var(--line)] animate-pulse" />
                    <div className="h-3 w-20 rounded bg-[var(--line)] animate-pulse" />
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="ml-1 md:ml-2 flex items-center justify-center rounded-lg p-1 md:p-1.5 text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--red)] active:text-[var(--red)] min-h-[44px] min-w-[44px]"
                aria-label="Sign out"
              >
                <I n="logout" size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold text-[var(--text)] mb-2">Sign out?</h2>
              <p className="text-sm text-[var(--muted)] mb-6">Are you sure you want to sign out from Akiba?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 font-semibold text-[var(--text)] transition hover:bg-[var(--bg)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-lg bg-[var(--red)] px-4 py-2.5 font-semibold text-white transition hover:bg-[var(--red-dark)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <motion.div
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <I n="logout" size={16} />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
