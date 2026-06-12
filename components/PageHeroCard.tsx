'use client'

import { motion } from 'framer-motion'
import { I } from './Icons'

interface PageHeroCardProps {
  icon?: string
  badge?: string
  title: string
  subtitle: string
  children?: React.ReactNode
  /** 'gradient' (default) matches the primary-soft hero look; 'card' matches the sidebar surface */
  surface?: 'gradient' | 'card'
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
      className="page-hero-pro"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="page-hero-pro-inner">
        <div className="page-hero-pro-copy">
          {badge && (
            <div className="page-hero-pro-badge">
              <I n={icon} size={14} />
              <span>{badge}</span>
            </div>
          )}
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children && <div className="page-hero-pro-actions">{children}</div>}
      </div>
    </motion.div>
  )
}
