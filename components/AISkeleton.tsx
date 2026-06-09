import { motion } from 'framer-motion'
import { Skeleton, SkeletonText } from './Skeleton'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export function AISkeleton() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Ask Akiba</h1>
          <p>Get spending insights powered by AI</p>
        </div>
      </div>

      <div className="chat-shell">
        {/* Chat card */}
        <motion.div className="chat-card" {...stagger(0)}>
          <div className="chat-log">
            {/* Welcome messages skeleton */}
            <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
              <div style={{ background: 'var(--card-2)', border: '1px solid var(--line)', borderRadius: 15, padding: '12px 16px', borderBottomLeftRadius: 5 }}>
                <SkeletonText lines={3} />
              </div>
            </div>

            {/* Sample user message */}
            <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
              <div style={{ background: 'var(--primary-grad)', borderRadius: 15, padding: '12px 16px', borderBottomRightRadius: 5 }}>
                <Skeleton height={14} width={200} />
              </div>
            </div>

            {/* AI response with typing indicator */}
            <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
              <div style={{ background: 'var(--card-2)', border: '1px solid var(--line)', borderRadius: 15, padding: '12px 16px', borderBottomLeftRadius: 5 }}>
                <SkeletonText lines={2} />
              </div>
            </div>
          </div>

          {/* Chat input */}
          <div className="chat-input">
            <Skeleton height={42} />
            <Skeleton width={46} height={42} />
          </div>
        </motion.div>

        {/* Sidebar card */}
        <motion.div className="card" {...stagger(1)}>
          <Skeleton height={16} width={140} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={80} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
