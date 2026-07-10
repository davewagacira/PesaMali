'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { Donut } from '@/components/Charts'
import { PageHeroCard } from '@/components/PageHeroCard'
import { useMetrics, fmt, fmtN, MetricExpense } from '@/lib/metrics'
import { AnalyticsSkeleton } from '@/components/AnalyticsSkeleton'
import { listContainer, listItem } from '@/lib/motion'
import { MonthPicker, currentNairobiMonth, parseMonthKey, formatMonthLabel } from '@/components/MonthPicker'

const full = (s: string) =>
  ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[s] || s)

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [trends, setTrends] = useState<{ label: string; amt: number }[]>([])
  const [budget, setBudget] = useState(15000)
  const [savingsGoal, setSavingsGoal] = useState(2000)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentNairobiMonth)

  const currentMonth = currentNairobiMonth()
  const isCurrentMonth = selectedMonth === currentMonth

  // Derive the "now" to pass to useMetrics — for past months, pin to the last
  // day of that month so metrics are calculated over the full month.
  const metricsNow = (() => {
    if (isCurrentMonth) return new Date()
    const { year, month } = parseMonthKey(selectedMonth)
    // Last day of the selected month
    return new Date(year, month, 0, 23, 59, 59)
  })()

  useEffect(() => {
    setIsLoading(true)
    const { year, month } = parseMonthKey(selectedMonth)
    Promise.all([
      // Budget for the selected month (falls back to profile default)
      fetch(`/api/monthly-budgets?year=${year}&month=${month}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.budget !== undefined) setBudget(d.budget)
          if (d.savingsGoal !== undefined) setSavingsGoal(d.savingsGoal)
        })
        .catch(() => {
          // Fall back to profile current budget
          fetch('/api/profiles/current')
            .then((r) => r.json())
            .then((d) => {
              if (d.monthlyBudget !== undefined) setBudget(d.monthlyBudget)
              if (d.savingsGoal !== undefined) setSavingsGoal(d.savingsGoal)
            })
            .catch(() => {})
        }),
      // Expenses for the selected month
      fetch(`/api/expenses?month=${selectedMonth}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setExpenses(
              d.map((e: { id: string; date: string; category: string; item: string; amount: number; fixed?: boolean | null }) => ({
                id: e.id, date: e.date, cat: e.category, item: e.item, amt: e.amount, fixed: e.fixed,
              }))
            )
          }
        })
        .catch(() => {}),
      // Monthly trends bar chart — always shows full history regardless of selected month
      fetch('/api/analytics/trends')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setTrends(d)
          }
        })
        .catch(() => {}),
    ]).finally(() => setIsLoading(false))
  }, [selectedMonth])

  const m = useMetrics(expenses, budget, savingsGoal, metricsNow)
  const top = m.topItems[0]
  const topDay = [...m.dowOrdered].sort((a, b) => b.amt - a.amt)[0]
  const maxD = Math.max(...m.dowOrdered.map((o) => o.amt), 1)
  const maxT = Math.max(...trends.map((o) => o.amt), 1)

  const totalSpent = expenses.reduce((s, e) => s + e.amt, 0)

  if (isLoading && selectedMonth === currentMonth) return <AnalyticsSkeleton />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="barChart"
        badge="Insights"
        title="Analytics"
        subtitle={isCurrentMonth ? 'Where your money actually goes' : `Reviewing ${formatMonthLabel(selectedMonth)}`}
      />

      {/* Month picker */}
      <motion.div className="card" variants={listItem} style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            <I n="calendar" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Viewing month:
          </span>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          {!isCurrentMonth && totalSpent > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
              Total: <b style={{ color: 'var(--text)' }}>{fmt(totalSpent)}</b> of{' '}
              <b style={{ color: 'var(--text)' }}>{fmt(budget)}</b> budget
            </span>
          )}
        </div>
      </motion.div>

      {/* Loading state when switching months */}
      {isLoading ? (
        <motion.div
          className="card"
          variants={listItem}
          style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}
        >
          Loading {formatMonthLabel(selectedMonth)} data…
        </motion.div>
      ) : expenses.length === 0 ? (
        <motion.div
          className="card"
          variants={listItem}
          style={{ padding: '48px 24px', textAlign: 'center' }}
        >
          <I n="receipt" size={28} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <b style={{ display: 'block', marginBottom: 8 }}>No expenses for {formatMonthLabel(selectedMonth)}</b>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            {isCurrentMonth
              ? 'Start logging expenses to see your analytics.'
              : 'No expenses were recorded for this month.'}
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div className="grid cols-3" style={{ marginBottom: 16 }} variants={listContainer}>
            <motion.div className="card" variants={listItem}>
              <h3><I n="coins" size={14} />Daily average</h3>
              <div className="kpi">{fmt(m.flexibleSpent / m.daysWithSpend)}</div>
              <div className="delta">across days with spending</div>
            </motion.div>
            <motion.div className="card" variants={listItem}>
              <h3><I n="search" size={14} />Most frequent expense</h3>
              <div className="kpi" style={{ fontSize: 19 }}>{top ? top.name : 'None'}</div>
              <div className="delta">{top ? `${top.n} entries · ${fmt(top.amt)} total` : ''}</div>
            </motion.div>
            <motion.div className="card" variants={listItem}>
              <h3><I n="flame" size={14} />Heaviest day</h3>
              <div className="kpi" style={{ fontSize: 19 }}>{full(topDay.label)}</div>
              <div className="delta">{fmt(topDay.amt)} spent on {full(topDay.label)}s</div>
            </motion.div>
          </motion.div>

          <motion.div className="grid cols-2" style={{ marginBottom: 16 }} variants={listContainer}>
            <motion.div className="card" variants={listItem}>
              <h3><I n="barChart" size={14} />Spending by day of week</h3>
              <div className="bar-chart">
                {m.dowOrdered.map((o, i) => (
                  <div className="bar-col" key={o.label}>
                    <span className="v">{o.amt ? fmtN(o.amt) : ''}</span>
                    <motion.span
                      className="stick"
                      style={{ height: Math.max(3, (o.amt / maxD) * 100) + '%', transformOrigin: 'bottom' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.04, ease: 'easeOut' }}
                    />
                    <span className="d">{o.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div className="card" variants={listItem}>
              <h3><I n="chart" size={14} />Spending by category</h3>
              {m.byFlexCat.length ? (
                <Donut byCat={m.byFlexCat} total={m.flexibleSpent} />
              ) : (
                <p className="chart-note">No data yet.</p>
              )}
            </motion.div>
          </motion.div>

          <motion.div className="card" variants={listItem} style={{ marginBottom: 16 }}>
            <h3><I n="receipt" size={14} />Category breakdown — {formatMonthLabel(selectedMonth)}</h3>
            {m.byFlexCat.map((c) => (
              <div className="cat-row" key={c.id}>
                <div className="t">
                  <b><I n={c.icon} size={14} style={{ color: c.color }} />{c.name}</b>
                  <span>{fmt(c.amt)} · {Math.round((c.amt / m.flexibleSpent) * 100)}%</span>
                </div>
                <div className="bar">
                  <motion.span
                    className="fill"
                    style={{ background: c.color, width: (c.amt / m.flexibleSpent) * 100 + '%', transformOrigin: 'left' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
            <p className="chart-note">
              {isCurrentMonth ? (
                <>
                  Projected month-end spend at current pace:{' '}
                  <b className="mono" style={{ color: 'var(--text)' }}>{fmt(m.projected)}</b> against a{' '}
                  {fmt(budget)} budget.
                </>
              ) : (
                <>
                  Final spend for {formatMonthLabel(selectedMonth)}:{' '}
                  <b className="mono" style={{ color: 'var(--text)' }}>{fmt(totalSpent)}</b> against a{' '}
                  {fmt(budget)} budget
                  {totalSpent <= budget
                    ? <> — <span style={{ color: '#10B981' }}>{fmt(budget - totalSpent)} under budget ✓</span></>
                    : <> — <span style={{ color: '#EF4444' }}>{fmt(totalSpent - budget)} over budget ✗</span></>
                  }.
                </>
              )}
            </p>
          </motion.div>
        </>
      )}

      {/* Monthly Trends bar — always visible, shows all-time history */}
      <motion.div className="card" variants={listItem} style={{ marginBottom: 16 }}>
        <h3><I n="flame" size={14} />Monthly Trends — all time</h3>
        {trends.length ? (
          <div className="bar-chart" style={{ height: 180, marginTop: 16 }}>
            {trends.map((o, i) => (
              <div
                className="bar-col"
                key={o.label}
                style={{
                  minWidth: 40,
                  // highlight the currently selected month
                  opacity: trends.find((t) => t.label === o.label) ? 1 : 0.5,
                }}
              >
                <span className="v">{o.amt ? fmtN(o.amt) : ''}</span>
                <motion.span
                  className="stick"
                  style={{ height: Math.max(3, (o.amt / maxT) * 100) + '%', transformOrigin: 'bottom' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.04, ease: 'easeOut' }}
                />
                <span className="d">{o.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="chart-note">No trend data yet. Expenses from multiple months will appear here.</p>
        )}
      </motion.div>
    </motion.div>
  )
}
