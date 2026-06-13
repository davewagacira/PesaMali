'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from './Icons'
import { NotificationsBell } from './NotificationsBell'

interface HeaderProps {
  userName: string
  userId: string
  onMenuClick?: () => void
  profileAvatar?: string
  profileColor?: string
  profileName?: string
}

// Helper to map old emojis from DB to new Lucide icons if they exist
const mapLegacyAvatar = (avatar: string) => {
  const map: Record<string, string> = {
    '🎓': 'book',
    '💻': 'bot',
    '💼': 'wallet',
    '🚀': 'zap',
    '💎': 'sparkles',
    '😊': 'user',
  }
  return map[avatar] || avatar
}

export default function Header({ userName, userId, onMenuClick, profileAvatar, profileColor, profileName }: HeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    const cover = document.createElement('div')
    cover.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff'
    document.body.appendChild(cover)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/'
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)] w-full">
        <div className="flex h-12 md:h-16 w-full items-center justify-between px-3 md:px-6">
          {/* Hamburger — moile ly */}
          <button
            className="flex md:hidden items-center justify-center rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] min-h-[44px] min-w-[44px]"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <I n="menu" size={22} />
          </button>
          {/* Right: Notifications + profile avatar (always visible) */}
          <div className="flex items-center gap-3 ml-auto">
            {userId && <NotificationsBell userId={userId} />}

            {userName ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 rounded-full hover:bg-[var(--bg)] p-1 pr-3 transition"
                >
                  <div 
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--primary)] shadow-sm border border-[var(--line)]"
                    style={profileColor ? { background: `${profileColor}15`, borderColor: `${profileColor}30`, color: profileColor } : {}}
                  >
                    {profileAvatar ? <I n={mapLegacyAvatar(profileAvatar)} size={16} /> : userName[0].toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col items-start min-w-[80px]">
                    <span className="text-xs font-bold leading-tight">{profileName || userName}</span>
                    <span className="text-[10px] text-[var(--muted)] leading-tight">Switch profile</span>
                  </div>
                  <I n="chevronDown" size={14} style={{ color: 'var(--muted)', marginLeft: 4 }} />
                </button>
                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <motion.div
                        className="absolute right-0 top-12 z-50 mt-2 w-48 rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-[var(--shadow-lg)]"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
                          <b className="text-sm font-semibold">{profileName || userName}</b>
                        </div>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/profiles')
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)] hover:text-[var(--text)]"
                        >
                          <I n="refreshCw" size={14} />
                          Switch profile
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/profile')
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)] hover:text-[var(--text)]"
                        >
                          <I n="user" size={14} />
                          My Profile
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            router.push('/settings')
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)] hover:text-[var(--text)]"
                        >
                          <I n="settings" size={14} />
                          Settings
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            setShowLogoutConfirm(true)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--red)] transition hover:bg-[var(--red-soft)]"
                        >
                          <I n="logout" size={14} />
                          Sign out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--line)] animate-pulse flex-shrink-0" />
            )}
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
              <p className="text-sm text-[var(--muted)] mb-6">Are you sure you want to sign out from PesaMali?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-lg bg-[var(--red)] px-4 py-2.5 font-semibold text-white transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <I n="logout" size={16} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
