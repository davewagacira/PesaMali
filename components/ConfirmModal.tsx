'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes, remove',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
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
          onClick={onCancel}
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
              maxWidth: 420,
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
                  background: 'var(--red-soft)',
                  color: 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <I n="trash" size={28} />
              </div>
              <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>{title}</h2>
              {message && (
                <p style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  {message}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  className="btn"
                  style={{ background: 'var(--card-2)', color: 'var(--text)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onCancel}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="btn"
                  style={{ background: 'var(--red)', color: '#fff' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
