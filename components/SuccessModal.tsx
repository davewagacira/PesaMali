import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

interface SuccessModalProps {
  isOpen: boolean
  title: string
  message?: string
  variant?: 'success' | 'warning'
  onClose: () => void
}

export function SuccessModal({ isOpen, title, message, variant = 'success', onClose }: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 99,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              style={{
                zIndex: 100,
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                boxShadow: 'var(--shadow-lg)',
                padding: 32,
                minWidth: 360,
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: variant === 'warning' ? 'var(--red-soft)' : 'var(--green-soft)',
                  color: variant === 'warning' ? 'var(--red)' : 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <I n={variant === 'warning' ? 'alert' : 'check'} size={32} />
              </div>
              <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>{title}</h2>
              {message && (
                <p style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  {message}
                </p>
              )}
              <motion.button
                className="btn btn-primary"
                style={{ width: '100%' }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
              >
                Got it
              </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
