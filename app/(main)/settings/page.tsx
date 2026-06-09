'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

export default function SettingsPage() {
  const [b, setB] = useState('15000')
  const [g, setG] = useState('2000')
  const [toast, setToast] = useState<string | null>(null)

  const ping = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => {
        if (d.monthlyBudget) setB(String(d.monthlyBudget))
        if (d.savingsGoal) setG(String(d.savingsGoal))
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    const nb = parseFloat(b)
    const ng = parseFloat(g)
    if (!nb || nb <= 0) return ping('Enter a valid budget')
    if (ng < 0) return ping('Savings goal cannot be negative')
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: nb, savingsGoal: ng }),
      })
      if (res.ok) ping('Budget updated')
      else ping('Failed to save')
    } catch {
      ping('Network error')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Budget &amp; settings</h1>
          <p>Your money rules</p>
        </div>
      </div>
      <div className="settings-grid">
        <motion.div className="card" {...stagger(0)}>
          <h3><I n="wallet" size={14} />Monthly budget</h3>
          <div className="field">
            <label>Budget for this month (KES)</label>
            <input type="number" value={b} onChange={(e) => setB(e.target.value)} />
          </div>
          <div className="field">
            <label>Savings goal (KES to have left at month end)</label>
            <input type="number" value={g} onChange={(e) => setG(e.target.value)} />
          </div>
          <motion.button className="btn btn-primary" whileTap={{ scale: 0.97 }} onClick={save}>
            Save changes
          </motion.button>
        </motion.div>
        <motion.div className="card" {...stagger(1)}>
          <h3><I n="alert" size={14} />Alert thresholds</h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
            Akiba compares your spending pace against the month&apos;s progress.
          </p>
          {[
            ['var(--green)', 'var(--green-soft)', 'check', 'On track', 'Spending pace at or below month pace'],
            ['var(--amber)', 'var(--amber-soft)', 'alert', 'Slow down', 'Spending up to 15% ahead of pace'],
            ['var(--red)', 'var(--red-soft)', 'flame', 'Danger zone', 'More than 15% ahead — money may run out early'],
          ].map(([c, bg, ic, t, p]) => (
            <div className="thr" key={t}>
              <div className="sw2" style={{ background: bg, color: c }}>
                <I n={ic} size={16} />
              </div>
              <div>
                <b>{t}</b>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

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
    </div>
  )
}
