import { motion } from 'framer-motion'
import { Skeleton } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function AchievementsSkeleton() {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6">
        <Skeleton height={20} width={80} style={{ marginBottom: 12 }} />
        <Skeleton height={32} width={200} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width={300} />
      </div>

      <div className="ach-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <motion.div key={i} className="card" {...stagger(i)}>
            <div style={{ marginBottom: 13 }}>
              <Skeleton width={44} height={44} />
            </div>
            <Skeleton height={14} width={100} style={{ marginBottom: 6 }} />
            <Skeleton height={12} width="100%" style={{ marginBottom: 6 }} />
            <Skeleton height={12} width="90%" />
            <Skeleton height={16} width={50} style={{ marginTop: 12, position: 'absolute', top: 15, right: 15 }} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
