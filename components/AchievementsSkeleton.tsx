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
      <div className="page-head">
        <div>
          <h1>Achievements</h1>
          <p>Unlock milestones on your financial journey</p>
        </div>
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
