'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { AreaChart } from '@/components/Charts'
import { useMetrics, fmt, fmtN, catOf, iso, MetricExpense } from '@/lib/metrics'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { useAblyExpenses } from '@/lib/useAbly'
import { listContainer, listItem } from '@/lib/motion'

function Trend({ value }: { value: number }) {
  const tone = value >= 0 ? 'positive' : 'negative'
  return <span className={`dash-trend ${tone}`}>{value >= 0 ? '+' : ''}{Math.round(value)}%</span>
}

const MONEY_PRIVACY_KEY = 'pesamali:money-values-hidden'
const SPACED_MONEY_PRIVACY_KEY = 'pesa-mali:money-values-hidden'
const PREVIOUS_MONEY_PRIVACY_KEY = ['pes', 'arly:money-values-hidden'].join('')
const LEGACY_MONEY_PRIVACY_KEY = ['aki', 'ba:money-values-hidden'].join('')

function TxRow({ e, moneyText }: { e: MetricExpense; moneyText: (value: number) => string }) {
  const c = catOf(e.cat)
  const dt = new Date(e.date + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  })
  return (
    <div className="pro-tx">
      <div className="pro-tx-main">
        <span className="pro-tx-icon" style={{ color: c.color }}>
          <I n={c.icon} size={16} />
        </span>
        <div>
          <b>{e.item}</b>
          <span>{c.name} · {dt}</span>
        </div>
      </div>
      <strong>-{moneyText(e.amt)}</strong>
    </div>
  )
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [catBudgets, setCatBudgets] = useState<{ category: string; limit: number }[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [hideMoney, setHideMoney] = useState(false)

  const handleExpenseChange = useCallback((event: string, expense: any) => {
    if (event === 'add') {
      setExpenses((prev) => [
        { id: expense.id, date: expense.date, cat: expense.category, item: expense.item, amt: expense.amount },
        ...prev,
      ])
    } else if (event === 'delete') {
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    } else if (event === 'update') {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id
            ? { id: expense.id, date: expense.date, cat: expense.category, item: expense.item, amt: expense.amount }
            : e
        )
      )
    }
  }, [])

  useAblyExpenses(userId, handleExpenseChange)

  const refreshData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    let failed = false
    const guard = (r: Response) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`)
      return r.json()
    }
    await Promise.all([
      fetch('/api/user')
        .then(guard)
        .then((d) => {
          if (d.name) setUserName(d.name)
          if (d.id) setUserId(d.id)
        })
        .catch(() => { failed = true }),
      fetch('/api/profiles/current')
        .then(guard)
        .then((p) => {
          if (p.monthlyBudget !== undefined) setBudget(p.monthlyBudget)
          if (p.savingsGoal !== undefined) setGoal(p.savingsGoal)
        })
        .catch(() => { failed = true }),
      fetch('/api/expenses')
        .then(guard)
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
        .catch(() => { failed = true }),
      fetch('/api/category-budgets')
        .then(guard)
        .then((d) => {
          if (Array.isArray(d)) setCatBudgets(d)
        })
        .catch(() => { failed = true }),
    ]).finally(() => {
      setLoadError(failed)
      if (showLoading) setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    refreshData(true)
  }, [refreshData])

  useEffect(() => {
    const saved = window.localStorage.getItem(MONEY_PRIVACY_KEY)
    const spacedSaved = window.localStorage.getItem(SPACED_MONEY_PRIVACY_KEY)
    const previousSaved = window.localStorage.getItem(PREVIOUS_MONEY_PRIVACY_KEY)
    const legacySaved = window.localStorage.getItem(LEGACY_MONEY_PRIVACY_KEY)
    const stored = saved ?? spacedSaved ?? previousSaved ?? legacySaved
    const shouldHide = stored === 'true'
    if (saved === null && stored !== null) {
      window.localStorage.setItem(MONEY_PRIVACY_KEY, stored)
    }
    if (spacedSaved !== null) {
      window.localStorage.removeItem(SPACED_MONEY_PRIVACY_KEY)
    }
    if (previousSaved !== null) {
      window.localStorage.removeItem(PREVIOUS_MONEY_PRIVACY_KEY)
    }
    if (legacySaved !== null) {
      window.localStorage.removeItem(LEGACY_MONEY_PRIVACY_KEY)
    }
    setHideMoney(shouldHide)
  }, [])

  useEffect(() => {
    const checkToday = () => {
      const freshNow = new Date()
      setNow((current) => (iso(current) === iso(freshNow) ? current : freshNow))
    }
    const interval = window.setInterval(checkToday, 60_000)
    window.addEventListener('focus', checkToday)
    document.addEventListener('visibilitychange', checkToday)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkToday)
      document.removeEventListener('visibilitychange', checkToday)
    }
  }, [])

  const todayKey = iso(now)

  useEffect(() => {
    if (!isLoading) refreshData()
  }, [todayKey, isLoading, refreshData])

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const m = useMetrics(expenses, budget, goal, now)
  const firstName = userName.trim().split(/\s+/)[0] || 'there'
  const statusText = m.status === 'ok' ? 'Healthy' : m.status === 'warn' ? 'Watch pace' : 'Over pace'
  const budgetUsed = Math.min(100, m.spendPace * 100)
  const runway = Math.max(0, Math.floor((m.remaining - goal) / Math.max(m.dailyAllowance, 1)))
  const weekTotal = m.last7.reduce((sum, d) => sum + d.amt, 0)
  const topCategory = m.byCat[0]
  // Advice targets a category the user can actually trim, never a fixed bill.
  const topFlexCategory = m.byFlexCat[0]
  const avgDaily = m.spent / Math.max(1, now.getDate())
  const availableAfterGoal = m.remaining - goal
  const moneyText = useCallback((value: number) => fmt(value), [])
  const moneyNumber = useCallback((value: number) => (hideMoney ? '...' : fmtN(value)), [hideMoney])
  const percentText = useCallback((value: number) => `${Math.round(value)}%`, [])
  const toggleMoneyPrivacy = () => {
    setHideMoney((current) => {
      const next = !current
      window.localStorage.setItem(MONEY_PRIVACY_KEY, String(next))
      return next
    })
  }

  const envelopes = catBudgets
    .map((b) => {
      const c = catOf(b.category)
      const spent = expenses.filter((e) => e.cat === b.category).reduce((s, e) => s + e.amt, 0)
      return { ...b, c, spent, remaining: b.limit - spent, pct: spent / Math.max(b.limit, 1) }
    })
    .sort((a, b) => b.pct - a.pct)

  if (isLoading) return <DashboardSkeleton />

  return (
    <motion.div className="pro-page" variants={listContainer} initial="hidden" animate="show">
      {loadError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            marginBottom: 14,
          }}
        >
          <span>Some of your data failed to load — figures below may be incomplete.</span>
          <button
            type="button"
            onClick={() => refreshData(false)}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              background: '#EF4444',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Retry
          </button>
        </div>
      )}
      <motion.section className="pro-hero" variants={listItem}>
        <div>
          <span className="pro-eyebrow">Finance command center</span>
          <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {firstName}</h1>
          <p>Your month is {Math.round(m.monthPace * 100)}% complete with {moneyText(m.remaining)} still available.</p>
        </div>
        <div className="pro-hero-actions">
          <span className={`pro-status ${m.status}`}>
            <span />
            {statusText}
          </span>
        </div>
      </motion.section>

      <motion.section className="dash-command" variants={listItem}>
        <div className="dash-runway">
          <div className="dash-runway-head">
            <span className="dash-label">Money remaining</span>
          </div>
          <strong className={m.remaining < 0 ? 'danger' : ''}>
            <small>KES</small> {moneyNumber(Math.abs(m.remaining))}
            <button
              type="button"
              className="money-privacy-toggle"
              onClick={toggleMoneyPrivacy}
              aria-pressed={hideMoney}
              title={hideMoney ? 'Show money values' : 'Hide money values'}
            >
              <I n={hideMoney ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </strong>
          <p>
            {m.remaining < 0
              ? `${moneyText(m.spent)} spent this month · ${moneyText(-m.remaining)} over budget`
              : `${moneyText(m.spent)} spent this month · ${moneyText(m.todaySpent)} spent today`}
          </p>
          <p className="dash-runway-sub">
            Flexible guide: {moneyText(m.dailyAllowance)} per day · {m.daysLeft} budget days left
          </p>
        </div>
        <div className="dash-budget-meter">
          <div className="dash-meter-head">
            <span>Flexible budget utilization</span>
            <b>{percentText(budgetUsed)}</b>
          </div>
          <div className="dash-meter">
            <span className={`fill f-${m.status}`} style={{ width: `${budgetUsed}%` }} />
          </div>
          <div className="dash-meter-foot">
            <span>{moneyText(m.flexibleSpent)} flexible spent</span>
            <span>{moneyText(m.flexibleBudget)} flexible budget</span>
          </div>
          {m.fixedSpent > 0 && (
            <div className="dash-meter-foot">
              <span>Fixed bills paid (rent, internet)</span>
              <span>{moneyText(m.fixedSpent)}</span>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section className="pro-kpis" variants={listContainer}>
        {[
          {
            icon: 'shield',
            label: 'After savings goal',
            value: availableAfterGoal >= 0 ? moneyText(availableAfterGoal) : `${moneyText(Math.abs(availableAfterGoal))} short`,
            meta: `Savings target: ${moneyText(goal)}`,
            trend: 8,
          },
          { icon: 'calendar', label: 'Runway', value: `${runway} days`, meta: 'Estimated budget runway', trend: runway - m.daysLeft },
          { icon: 'barChart', label: '7-day spend', value: moneyText(weekTotal), meta: `${moneyText(avgDaily)} avg per day`, trend: -4 },
          { icon: 'chart', label: 'Top category', value: topCategory?.name || 'No data', meta: topCategory ? moneyText(topCategory.amt) : 'Start logging expenses', trend: topCategory ? 12 : 0 },
        ].map((k) => (
          <motion.div className="pro-kpi" variants={listItem} key={k.label}>
            <div className="pro-kpi-top">
              <span><I n={k.icon} size={16} /></span>
              <Trend value={k.trend} />
            </div>
            <small>{k.label}</small>
            <b>{k.value}</b>
            <p>{k.meta}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section className="pro-grid-main" variants={listContainer}>
        <motion.div className="pro-panel pro-chart-panel" variants={listItem}>
          <div className="pro-panel-head">
            <div>
              <span className="pro-eyebrow">Spend pace</span>
              <h2>Flexible spend vs monthly plan</h2>
            </div>
            <span className="pro-chip">Day {now.getDate()} of {daysInMonth}</span>
          </div>
          <AreaChart cum={m.cum} budget={m.flexibleBudget} status={m.status} daysInMonth={daysInMonth} />
        </motion.div>

        <motion.div className="pro-panel" variants={listItem}>
          <div className="pro-panel-head">
            <div>
              <span className="pro-eyebrow">Envelope risk</span>
              <h2>Category budgets</h2>
            </div>
          </div>
          <div className="dash-envelope-list">
            {envelopes.length ? envelopes.slice(0, 5).map((env) => (
              <div className="dash-envelope" key={env.category}>
                <div>
                  <span style={{ color: env.c.color }}><I n={env.c.icon} size={15} /></span>
                  <b>{env.c.name}</b>
                </div>
                <strong className={env.remaining < 0 ? 'danger' : ''}>
                  {env.remaining < 0 ? `${moneyText(-env.remaining)} over` : `${moneyText(env.remaining)} left`}
                </strong>
                <div className="dash-mini-meter">
                  <span
                    className={env.pct >= 1 ? 'danger' : env.pct >= 0.8 ? 'warn' : 'ok'}
                    style={{ width: `${Math.min(100, env.pct * 100)}%` }}
                  />
                </div>
                <small>{moneyText(env.spent)} of {moneyText(env.limit)}</small>
              </div>
            )) : (
              <div className="pro-empty">
                <I n="target" size={20} />
                <b>No envelopes yet</b>
                <p>Add category budgets in Settings to monitor allocation risk.</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.section>

      <motion.section className="pro-grid-main bottom" variants={listContainer}>
        <motion.div className="pro-panel" variants={listItem}>
          <div className="pro-panel-head">
            <div>
              <span className="pro-eyebrow">Recent movement</span>
              <h2>Latest transactions</h2>
            </div>
          </div>
          {m.recentTx.length ? m.recentTx.map((e) => <TxRow key={e.id} e={e} moneyText={moneyText} />) : (
            <div className="pro-empty">
              <I n="receipt" size={20} />
              <b>No expenses yet</b>
              <p>Log your first transaction to activate the dashboard.</p>
            </div>
          )}
        </motion.div>

        <motion.div className="pro-panel pro-insight-panel" variants={listItem}>
          <div className="pro-panel-head">
            <div>
              <span className="pro-eyebrow">Next best action</span>
              <h2>Financial guidance</h2>
            </div>
          </div>
          <div className="dash-advice">
            <span><I n={m.status === 'danger' ? 'alert' : 'sparkles'} size={20} /></span>
            <b>
              {m.status === 'ok'
                ? 'Your pace is controlled. Keep the daily ceiling visible.'
                : m.status === 'warn'
                  ? 'You are ahead of pace. Reduce discretionary spending this week.'
                  : 'Spending has moved beyond plan. Freeze non-essential categories today.'}
            </b>
            <p>
              {topFlexCategory
                ? `${topFlexCategory.name} is leading flexible spend at ${moneyText(topFlexCategory.amt)}. Target that category first for the fastest correction.`
                : 'Start with three logged expenses so PesaMali can identify your strongest spending pattern.'}
            </p>
          </div>
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
