'use client'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Returns the current Nairobi month key as "YYYY-MM" */
export function currentNairobiMonth(): string {
  const nairobi = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }))
  const y = nairobi.getFullYear()
  const m = String(nairobi.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Parse "YYYY-MM" into { year, month } (1-indexed month) */
export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-')
  return { year: Number(y), month: Number(m) }
}

/** Format "YYYY-MM" → "July 2026" */
export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

/** Step a "YYYY-MM" key by `delta` months (-1 or +1) */
export function stepMonth(key: string, delta: -1 | 1): string {
  const { year, month } = parseMonthKey(key)
  const date = new Date(year, month - 1 + delta, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

interface MonthPickerProps {
  value: string           // "YYYY-MM"
  onChange: (key: string) => void
  /** Optionally cap the forward arrow at the current month (default: true) */
  maxCurrentMonth?: boolean
}

export function MonthPicker({ value, onChange, maxCurrentMonth = true }: MonthPickerProps) {
  const current = currentNairobiMonth()
  const atCurrent = value >= current

  const prev = () => onChange(stepMonth(value, -1))
  const next = () => {
    if (maxCurrentMonth && atCurrent) return
    onChange(stepMonth(value, 1))
  }

  return (
    <div className="month-picker">
      <motion.button
        className="month-arrow"
        onClick={prev}
        whileTap={{ scale: 0.88 }}
        aria-label="Previous month"
        title="Previous month"
      >
        <I n="chevronLeft" size={16} />
      </motion.button>

      <span className="month-label">
        {formatMonthLabel(value)}
        {value === current && (
          <span className="month-current-badge">this month</span>
        )}
      </span>

      <motion.button
        className="month-arrow"
        onClick={next}
        whileTap={{ scale: 0.88 }}
        disabled={maxCurrentMonth && atCurrent}
        aria-label="Next month"
        title={maxCurrentMonth && atCurrent ? 'Cannot navigate beyond the current month' : 'Next month'}
        style={{ opacity: maxCurrentMonth && atCurrent ? 0.35 : 1 }}
      >
        <I n="chevronRight" size={16} />
      </motion.button>
    </div>
  )
}
