'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'
import { SuccessModal } from '@/components/SuccessModal'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

const CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#FF6B6B' },
  { name: 'Transport', icon: 'bus', color: '#4ECDC4' },
  { name: 'Rent', icon: 'home', color: '#45B7D1' },
  { name: 'Entertainment', icon: 'film', color: '#FFA07A' },
  { name: 'Utilities', icon: 'zap', color: '#FFD93D' },
  { name: 'Health', icon: 'heart', color: '#6BCB77' },
  { name: 'Airtime', icon: 'phone', color: '#A8DADC' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#F1FAEE' },
  { name: 'Other', icon: 'plus', color: '#9D84B7' },
]

export default function LogPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !amount) return

    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          category,
          item,
          amount: parseFloat(amount),
        }),
      })

      setItem('')
      setAmount('')
      setCategory('Other')
      setShowSuccess(true)
    } catch (error) {
      console.error('Error logging expense:', error)
    }
  }

  return (
    <div>
      <PageHeroCard
        icon="plusCircle"
        badge="New expense"
        title="Log an expense"
        subtitle="Every shilling counted. Balances update instantly."
      />

      <div className="log-grid">
        <motion.div className="card" {...stagger(0)}>
          <h3>
            <I n="calendar" size={14} />
            When?
          </h3>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
        </motion.div>

        <motion.div className="card" {...stagger(1)}>
          <h3>
            <I n="tag" size={14} />
            Category
          </h3>
          <div className="grid cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition ${
                  category === cat.name
                    ? 'border border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border border-[var(--line)] bg-[var(--card)]'
                }`}
              >
                <div style={{ color: cat.color }}>
                  <I n={cat.icon} size={20} />
                </div>
                <span className="text-xs font-semibold text-[var(--text)]">{cat.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div className="card" {...stagger(2)}>
          <h3>
            <I n="receipt" size={14} />
            What did you buy?
          </h3>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g., Lunch, Uber, Netflix"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
        </motion.div>

        <motion.div className="card" {...stagger(3)}>
          <h3>
            <I n="wallet" size={14} />
            How much? (KES)
          </h3>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
        </motion.div>

        <motion.button
          onClick={handleSubmit}
          disabled={!item || !amount}
          className="card flex items-center justify-center gap-2 rounded-lg [background:var(--primary-grad)] p-4 font-semibold text-white transition active:scale-95 disabled:opacity-50"
          {...stagger(4)}
        >
          <I n="check" size={18} />
          Log expense
        </motion.button>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        title="Expense logged!"
        message="Your expense has been added and your balance updated."
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}
