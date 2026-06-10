'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

interface Toast {
  id: string
  type: 'success' | 'warning' | 'info' | 'achievement'
  title: string
  message: string
  icon?: string
}

export function NotificationToast({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    achievement: 'bg-purple-50 border-purple-200',
  }

  const textColors = {
    success: 'text-green-900',
    warning: 'text-amber-900',
    info: 'text-blue-900',
    achievement: 'text-purple-900',
  }

  const iconColors = {
    success: 'text-green-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
    achievement: 'text-purple-600',
  }

  const iconName =
    toast.icon || (toast.type === 'achievement' ? 'trophy' : toast.type === 'warning' ? 'alert' : 'check')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 20, x: 0 }}
      className={`rounded-lg border px-4 py-3 shadow-lg ${bgColors[toast.type]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${iconColors[toast.type]}`}>
          <I n={iconName} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColors[toast.type]}`}>{toast.title}</h3>
          <p className={`text-sm mt-0.5 ${textColors[toast.type]} opacity-90`}>{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className={`shrink-0 opacity-40 hover:opacity-100 transition ${textColors[toast.type]}`}
        >
          <I n="x" size={18} />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
