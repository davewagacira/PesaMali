'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface DatePickerProps {
  value: string // yyyy-mm-dd
  onChange: (v: string) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'down' | 'up'>('down')
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayKey = toKey(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  const sel = value
    ? new Date(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10))
    : today
  const [viewY, setViewY] = useState(sel.getFullYear())
  const [viewM, setViewM] = useState(sel.getMonth())

  useEffect(() => {
    if (!open) return
    const updatePlacement = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setPlacement(spaceBelow < 340 && spaceAbove > spaceBelow ? 'up' : 'down')
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    updatePlacement()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open])

  const openPicker = () => {
    setViewY(sel.getFullYear())
    setViewM(sel.getMonth())
    setOpen((o) => !o)
  }

  const nav = (dir: number) => {
    const dt = new Date(viewY, viewM + dir, 1)
    setViewY(dt.getFullYear())
    setViewM(dt.getMonth())
  }

  const pick = (key: string) => {
    onChange(key)
    setOpen(false)
  }

  const firstDow = new Date(viewY, viewM, 1).getDay()
  const daysIn = new Date(viewY, viewM + 1, 0).getDate()
  const daysInPrev = new Date(viewY, viewM, 0).getDate()
  const cells: { key: string; d: number; dim: boolean }[] = []
  for (let i = firstDow - 1; i >= 0; i--) {
    const dt = new Date(viewY, viewM - 1, daysInPrev - i)
    cells.push({ key: toKey(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: daysInPrev - i, dim: true })
  }
  for (let d = 1; d <= daysIn; d++) {
    cells.push({ key: toKey(viewY, viewM, d), d, dim: false })
  }
  let next = 1
  while (cells.length % 7 !== 0) {
    const dt = new Date(viewY, viewM + 1, next)
    cells.push({ key: toKey(dt.getFullYear(), dt.getMonth(), dt.getDate()), d: next, dim: true })
    next++
  }

  const monthLabel = new Date(viewY, viewM, 1).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  })
  const triggerLabel = sel.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="dp" ref={ref}>
      <button type="button" className="dp-trigger" onClick={openPicker}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I n="calendar" size={15} />
          {triggerLabel}
        </span>
        <I n="chevronDown" size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`dp-pop ${placement === 'up' ? 'up' : ''}`}
            initial={{ opacity: 0, y: placement === 'up' ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'up' ? 6 : -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="dp-head">
              <button type="button" className="dp-nav" onClick={() => nav(-1)} aria-label="Previous month">
                <I n="chevronLeft" size={15} />
              </button>
              <b>{monthLabel}</b>
              <button type="button" className="dp-nav" onClick={() => nav(1)} aria-label="Next month">
                <I n="chevronRight" size={15} />
              </button>
            </div>
            <div className="dp-grid">
              {DOW.map((d) => (
                <span key={d} className="dp-dow">
                  {d}
                </span>
              ))}
              {cells.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  className={
                    'dp-day' +
                    (c.dim ? ' dim' : '') +
                    (c.key === value ? ' sel' : c.key === todayKey ? ' today' : '')
                  }
                  onClick={() => pick(c.key)}
                >
                  {c.d}
                </button>
              ))}
            </div>
            <div className="dp-quick">
              <button type="button" onClick={() => pick(todayKey)}>
                Today
              </button>
              <button type="button" onClick={() => pick(yesterdayKey)}>
                Yesterday
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
