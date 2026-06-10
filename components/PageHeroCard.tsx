'use client'

import { motion } from 'framer-motion'
import { I } from './Icons'

interface PageHeroCardProps {
  icon?: string
  badge?: string
  title: string
  subtitle: string
  children?: React.ReactNode
}

export function PageHeroCard({
  icon = 'target',
  badge,
  title,
  subtitle,
  children,
}: PageHeroCardProps) {
  return (
    <motion.div
      className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1.5 mb-4">
              <I n={icon} size={14} />
              <span className="text-xs font-semibold text-[var(--primary)]">{badge}</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-[var(--text)] mb-2 leading-tight">
            {title}
          </h1>
          <p className="text-[var(--muted)]">{subtitle}</p>
        </div>
        {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
      </div>
    </motion.div>
  )
}
