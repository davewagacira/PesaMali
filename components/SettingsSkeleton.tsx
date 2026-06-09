import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function SettingsSkeleton() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Budget &amp; settings</h1>
          <p>Your money rules</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile card */}
        <motion.div className="card" {...stagger(0)}>
          <Skeleton height={16} width={120} style={{ marginBottom: 16 }} />

          {/* Name field */}
          <div style={{ marginBottom: 15 }}>
            <Skeleton height={12} width={60} style={{ marginBottom: 6 }} />
            <Skeleton height={42} />
          </div>

          {/* Email field */}
          <div style={{ marginBottom: 20 }}>
            <Skeleton height={12} width={60} style={{ marginBottom: 6 }} />
            <Skeleton height={42} />
          </div>

          <Skeleton height={44} width={150} style={{ marginBottom: 12 }} />

          {/* Password section */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
            <Skeleton height={13} width={140} style={{ marginBottom: 12 }} />
            <Skeleton height={40} width={180} />
          </div>
        </motion.div>

        {/* Budget card */}
        <motion.div className="card" {...stagger(1)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />

          {/* Two input fields */}
          {[0, 1].map((i) => (
            <div key={i} style={{ marginBottom: 15 }}>
              <Skeleton height={12} width={160} style={{ marginBottom: 6 }} />
              <Skeleton height={42} />
            </div>
          ))}

          <Skeleton height={44} width={150} />
        </motion.div>

        {/* Alerts card */}
        <motion.div className="card" {...stagger(2)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />
          <SkeletonText lines={1} style={{ marginBottom: 12 }} />

          {/* Alert threshold items */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
              <Skeleton width={34} height={34} circle />
              <div style={{ flex: 1 }}>
                <Skeleton height={13} width={100} style={{ marginBottom: 6 }} />
                <Skeleton height={11} width={180} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* 2FA card - full width */}
        <motion.div className="card" style={{ gridColumn: '1 / -1' }} {...stagger(3)}>
          <Skeleton height={16} width={280} style={{ marginBottom: 16 }} />

          {/* Status row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <Skeleton height={13} width={200} style={{ marginBottom: 8 }} />
              <SkeletonText lines={2} />
            </div>
            <Skeleton width={140} height={32} />
          </div>

          <Skeleton height={44} width={160} />
        </motion.div>
      </div>
    </div>
  )
}
