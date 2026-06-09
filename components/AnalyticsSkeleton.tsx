import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function AnalyticsSkeleton() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Where your money actually goes</p>
        </div>
      </div>

      <div className="grid cols-2">
        {/* Top item card */}
        <motion.div className="card" {...stagger(0)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />
          <Skeleton height={32} width={160} style={{ marginBottom: 8 }} />
          <SkeletonText lines={2} />
        </motion.div>

        {/* Top day card */}
        <motion.div className="card" {...stagger(1)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />
          <Skeleton height={32} width={140} style={{ marginBottom: 8 }} />
          <SkeletonText lines={2} />
        </motion.div>
      </div>

      {/* Charts grid */}
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        {/* Bar chart card */}
        <motion.div className="card" {...stagger(2)}>
          <Skeleton height={16} width={120} style={{ marginBottom: 16 }} />
          <div style={{ height: 165, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <Skeleton height={Math.random() * 100 + 20} width="100%" />
                <Skeleton height={10} width={30} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Category breakdown card */}
        <motion.div className="card" {...stagger(3)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Skeleton height={12} width={100} />
                  <Skeleton height={12} width={60} />
                </div>
                <Skeleton height={9} width="100%" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily breakdown card */}
      <motion.div className="card" {...stagger(4)}>
        <Skeleton height={16} width={200} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton height={12} width={80} />
              <Skeleton height={28} width={150} />
              <Skeleton height={12} width={70} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
