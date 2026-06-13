'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { useAblyNotifications } from '@/lib/useAbly'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export function NotificationsBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [isOpen])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        if (d.notifications) {
          setNotifications(d.notifications)
          setUnread(d.unread || 0)
        }
      })
      .catch(() => {})
  }, [])

  useAblyNotifications(userId, (notification) => {
    setNotifications((prev) => [notification, ...prev])
    setUnread((prev) => prev + 1)
  })

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnread((prev) => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const typeIcons: Record<string, string> = {
    budget_warning: 'alert',
    achievement: 'trophy',
    recurring_expense: 'repeat',
    goal_milestone: 'flag',
  }

  const cleanTitle = (title: string) => title.replace(/^\s*⏰\s*/, '')

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-10 w-10 rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] shadow-[var(--shadow)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <I n="bell" size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--red)] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed left-3 right-3 top-16 z-50 w-auto md:absolute md:left-auto md:right-0 md:top-12 md:w-96 rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <div className="border-b border-[var(--line)] p-4">
              <h3 className="font-semibold text-[var(--text)]">Notifications</h3>
              {unread > 0 && (
                <p className="text-xs text-[var(--muted)] mt-1">{unread} unread</p>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[var(--muted)]">No notifications yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`border-b border-[var(--line)] p-4 transition ${
                      notif.read ? 'opacity-60' : 'bg-[var(--bg)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-lg bg-[var(--primary-soft)] p-2 text-[var(--primary)] text-sm">
                        <I n={typeIcons[notif.type] || 'info'} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[var(--text)]">{cleanTitle(notif.title)}</h4>
                        <p className="text-xs text-[var(--muted)] mt-1">{notif.message}</p>
                        <p className="text-xs text-[var(--faint)] mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="p-1 rounded hover:bg-[var(--primary-soft)] text-[var(--muted)] hover:text-[var(--primary)]"
                            title="Mark as read"
                          >
                            <I n="check" size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1 rounded hover:bg-[var(--red-soft)] text-[var(--muted)] hover:text-[var(--red)]"
                          title="Delete"
                        >
                          <I n="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
