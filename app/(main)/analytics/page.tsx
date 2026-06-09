'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { Donut } from '@/components/Charts'
import { useMetrics, fmt, fmtN, MetricExpense } from '@/lib/metrics'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

const full = (s: string) =>
  ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[s] || s)

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => { if (d.monthlyBudget) setBudget(d.monthlyBudget) })
      .catch(() => {})
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setExpenses(
            d.map((e: { id: string; date: string; category: string; item: string; amount: number }) => ({
              id: e.id, date: e.date, cat: e.category, item: e.item, amt: e.amount,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const m = useMetrics(expenses, budget, 2000)
  const top = m.topItems[0]
  const topDay = [...m.dowOrdered].sort((a, b) => b.amt - a.amt)[0]
  const maxD = Math.max(...m.dowOrdered.map((o) => o.amt), 1)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Where your money actually goes</p>
        </div>
      </div>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <motion.div className="card" {...stagger(0)}>
          <h3><I n="coins" size={14} />Daily average</h3>
          <div className="kpi">{fmt(m.spent / m.daysWithSpend)}</div>
          <div className="delta">across days with spending</div>
        </motion.div>
        <motion.div className="card" {...stagger(1)}>
          <h3><I n="search" size={14} />Most bought item</h3>
          <div className="kpi" style={{ fontSize: 19 }}>{top ? top.name : '—'}</div>
          <div className="delta">{top ? `${top.n} times · ${fmt(top.amt)} total` : ''}</div>
        </motion.div>
        <motion.div className="card" {...stagger(2)}>
          <h3><I n="flame" size={14} />Heaviest day</h3>
          <div className="kpi" style={{ fontSize: 19 }}>{full(topDay.label)}</div>
          <div className="delta">{fmt(topDay.amt)} spent on {full(topDay.label)}s</div>
        </motion.div>
      </div>
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <motion.div className="card" {...stagger(3)}>
          <h3><I n="barChart" size={14} />Spending by day of week</h3>
          <div className="bar-chart">
            {m.dowOrdered.map((o, i) => (
              <div className="bar-col" key={o.label}>
                <span className="v">{o.amt ? fmtN(o.amt) : ''}</span>
                <motion.span
                  className="stick"
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(3, (o.amt / maxD) * 100) + '%' }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
                <span className="d">{o.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div className="card" {...stagger(4)}>
          <h3><I n="chart" size={14} />Spending by category</h3>
          {m.byCat.length ? (
            <Donut byCat={m.byCat} total={m.spent} />
          ) : (
            <p className="chart-note">No data yet.</p>
          )}
        </motion.div>
      </div>
      <motion.div className="card" {...stagger(5)}>
        <h3><I n="receipt" size={14} />Category breakdown</h3>
        {m.byCat.map((c) => (
          <div className="cat-row" key={c.id}>
            <div className="t">
              <b><I n={c.icon} size={14} style={{ color: c.color }} />{c.name}</b>
              <span>{fmt(c.amt)} · {Math.round((c.amt / m.spent) * 100)}%</span>
            </div>
            <div className="bar">
              <motion.span
                className="fill"
                style={{ background: c.color }}
                initial={{ width: 0 }}
                animate={{ width: (c.amt / m.spent) * 100 + '%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
        <p className="chart-note">
          Projected month-end spend at current pace:{' '}
          <b className="mono" style={{ color: 'var(--text)' }}>{fmt(m.projected)}</b> against a{' '}
          {fmt(budget)} budget.
        </p>
      </motion.div>
    </div>
  )
}
