import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function LogSkeleton() {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6">
        <Skeleton height={20} width={80} style={{ marginBottom: 12 }} />
        <Skeleton height={32} width={200} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width={300} />
      </div>

      <div className="log-grid">
        {/* Left card - form */}
        <motion.div className="card" {...stagger(0)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />

          {/* Quick buttons */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={100} height={28} />
            ))}
          </div>

          {/* Category buttons grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 15 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={60} />
            ))}
          </div>

          {/* Form fields */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ marginBottom: 15 }}>
              <Skeleton height={12} width={80} style={{ marginBottom: 6 }} />
              <Skeleton height={42} />
            </div>
          ))}

          <Skeleton height={44} />
        </motion.div>

        {/* Right card - transactions list */}
        <motion.div className="card" {...stagger(1)}>
          <Skeleton height={16} width={240} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Skeleton width={38} height={38} circle />
                  <div style={{ flex: 1 }}>
                    <Skeleton height={13} width={100} style={{ marginBottom: 6 }} />
                    <Skeleton height={11} width={80} />
                  </div>
                </div>
                <Skeleton width={70} height={13} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
