'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

interface Achievement {
  id: string
  title: string
  description: string
  icon?: string
  unlockedAt: string
}

export function AchievementsBadge() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/achievements')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAchievements(d))
      .catch(() => {})
  }, [])

  if (achievements.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <I n="trophy" size={16} />
        {achievements.length}
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--shadow-lg)]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-semibold text-[var(--text)]">Achievements ({achievements.length})</h3>
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {achievements.map((ach) => (
                <div key={ach.id} className="flex items-start gap-3 rounded-lg bg-[var(--bg)] p-3">
                  <div className="mt-1 rounded-lg bg-[var(--primary-soft)] p-2 text-[var(--primary)]">
                    <I n={ach.icon || 'star'} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-[var(--text)]">{ach.title}</h4>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{ach.description}</p>
                    <p className="text-xs text-[var(--faint)] mt-1">
                      {new Date(ach.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}
