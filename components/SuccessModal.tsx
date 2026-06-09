import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

interface SuccessModalProps {
  isOpen: boolean
  title: string
  message?: string
  onClose: () => void
}

export function SuccessModal({ isOpen, title, message, onClose }: SuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="modal-content" style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'var(--green-soft)',
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <I n="check" size={32} />
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
        </>
      )}
    </AnimatePresence>
  )
}
