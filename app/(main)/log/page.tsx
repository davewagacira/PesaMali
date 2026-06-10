'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'
import { CATS, catOf, fmt, fmtN, iso, MetricExpense } from '@/lib/metrics'
import { SuccessModal } from '@/components/SuccessModal'
import { DatePicker } from '@/components/DatePicker'
import { LogSkeleton } from '@/components/LogSkeleton'
import { listContainer, listItem } from '@/lib/motion'

function TxRow({ e, onDelete }: { e: MetricExpense; onDelete?: (id: string) => void }) {
  const c = catOf(e.cat)
  const dt = new Date(e.date + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  })
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="tx">
        <div className="l">
          <div className="cat-ic" style={{ color: c.color }}>
            <I n={c.icon} size={17} />
          </div>
          <div>
            <b>{e.item}</b>
            <span>
              {c.name} · {dt}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="amt">− {fmt(e.amt)}</span>
          {onDelete && (
            <button
              onClick={() => onDelete(e.id)}
              style={{ color: 'var(--faint)', fontSize: 11, padding: '2px 6px' }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function LogPage() {
  const [cat, setCat] = useState('food')
  const [item, setItem] = useState('')
  const [amt, setAmt] = useState('')
  const [date, setDate] = useState(iso(new Date()))
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [modalVariant, setModalVariant] = useState<'success' | 'warning'>('success')
  const [isLoading, setIsLoading] = useState(true)

  const ping = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setExpenses(
            d.map((e: { id: string; date: string; category: string; item: string; amount: number }) => ({
              id: e.id,
              date: e.date,
              cat: e.category,
              item: e.item,
              amt: e.amount,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const add = async () => {
    const a = parseFloat(amt)
    if (!item.trim()) return ping('Add a name for the expense')
    if (!a || a <= 0) return ping('Enter a valid amount')
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category: cat, item: item.trim(), amount: a }),
      })
      const data = await res.json()
      if (res.ok) {
        setExpenses((ex) => [
          ...ex,
          { id: data.id, date: data.date, cat: data.category, item: data.item, amt: data.amount },
        ])
        setItem('')
        setAmt('')
        const env = data.envelope as { limit: number; spent: number; remaining: number } | null
        const cName = catOf(cat).name
        if (env && env.remaining < 0) {
          setSuccessMessage(
            `The money you allocated for ${cName} is finished. You are now ${fmt(-env.remaining)} over your ${fmt(env.limit)} budget.`
          )
          setModalVariant('warning')
        } else if (env) {
          setSuccessMessage(
            `Expense logged. ${fmt(env.remaining)} left of the ${fmt(env.limit)} you allocated for ${cName}.`
          )
          setModalVariant('success')
        } else {
          setSuccessMessage('Expense logged successfully. Your balances have been updated.')
          setModalVariant('success')
        }
        setShowSuccessModal(true)
      }
    } catch {
      ping('Failed to save expense')
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      setExpenses((ex) => ex.filter((e) => e.id !== id))
    } catch {
      ping('Failed to delete')
    }
  }

  const quicks: [string, number, string][] = [
    ['Matatu fare', 80, 'transport'],
    ['Tomatoes', 50, 'food'],
    ['Airtime', 100, 'airtime'],
    ['WiFi', 4000, 'internet'],
  ]

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  if (isLoading) return <LogSkeleton />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="plusCircle"
        badge="New expense"
        title="Log an expense"
        subtitle="Every shilling counted. Balances update instantly."
      />
      <motion.div className="log-grid" variants={listContainer}>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="plusCircle" size={14} />
            New expense
          </h3>
          <div className="quick">
            {quicks.map((q) => (
              <button
                key={q[0]}
                onClick={() => {
                  setItem(q[0])
                  setAmt(String(q[1]))
                  setCat(q[2])
                }}
              >
                <I n="zap" size={12} />
                {q[0]} · {q[1]}
              </button>
            ))}
          </div>
          <div className="cat-pick">
            {CATS.map((c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.94 }}
                className={'cat-btn' + (cat === c.id ? ' sel' : '')}
                onClick={() => setCat(c.id)}
              >
                <I n={c.icon} size={17} />
                {c.name}
              </motion.button>
            ))}
          </div>
          <div className="field">
            <label>What did you buy?</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Tomatoes, Matatu fare, WiFi"
            />
          </div>
          <div className="field">
            <label>Amount (KES)</label>
            <input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              type="number"
              min="1"
              placeholder="e.g. 50"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
          </div>
          <div className="field">
            <label>Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <motion.button className="btn btn-primary" whileTap={{ scale: 0.97 }} onClick={add}>
            <I n="plusCircle" size={16} />
            Add expense
          </motion.button>
        </motion.div>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="receipt" size={14} />
            All expenses this month
            <span
              className="mono"
              style={{
                marginLeft: 'auto',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--muted)',
              }}
            >
              {sorted.length} logged
            </span>
          </h3>
          <div className="scroll">
            <AnimatePresence initial={false}>
              {sorted.map((e) => (
                <TxRow key={e.id} e={e} onDelete={deleteExpense} />
              ))}
            </AnimatePresence>
            {!sorted.length && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '18px 0' }}>
                No expenses yet. Log your first one to get started.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
          >
            <I n="check" size={15} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessModal
        isOpen={showSuccessModal}
        title={modalVariant === 'warning' ? 'Budget depleted!' : 'Success!'}
        message={successMessage}
        variant={modalVariant}
        onClose={() => setShowSuccessModal(false)}
      />
    </motion.div>
  )
}
