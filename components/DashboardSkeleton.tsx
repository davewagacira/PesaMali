import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function DashboardSkeleton() {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6">
        <Skeleton height={20} width={80} style={{ marginBottom: 12 }} />
        <Skeleton height={32} width={200} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width={300} />
      </div>

      {/* Hero skeleton */}
      <motion.div className="hero" {...stagger(0)}>
        <div>
          <Skeleton height={16} width={180} style={{ marginBottom: 12 }} />
          <Skeleton height={52} width={280} style={{ marginBottom: 6 }} />
          <Skeleton height={14} width={320} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
          <div>
            <Skeleton height={14} width={120} style={{ marginBottom: 10 }} />
            <Skeleton height={9} width="100%" />
          </div>
          <div>
            <Skeleton height={14} width={140} style={{ marginBottom: 10 }} />
            <Skeleton height={9} width="100%" />
          </div>
        </div>
      </motion.div>

      {/* Cards grid */}
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {[0, 1].map((i) => (
          <motion.div key={i} className="card" {...stagger(i + 1)}>
            <Skeleton height={16} width={140} style={{ marginBottom: 18 }} />
            <Skeleton height={32} width={180} style={{ marginBottom: 6 }} />
            <SkeletonText lines={2} />
          </motion.div>
        ))}
      </div>

      {/* Transactions skeleton */}
      <motion.div className="card" {...stagger(3)}>
        <Skeleton height={16} width={200} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Skeleton width={38} height={38} circle />
                <div style={{ flex: 1 }}>
                  <Skeleton height={13} width={120} style={{ marginBottom: 6 }} />
                  <Skeleton height={11} width={100} />
                </div>
              </div>
              <Skeleton width={80} height={13} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
