'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { AreaChart } from '@/components/Charts'
import { useMetrics, fmt, fmtN, catOf, MetricExpense } from '@/lib/metrics'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { NotificationsBell } from '@/components/NotificationsBell'
import { AchievementsBadge } from '@/components/AchievementsBadge'
import { useAblyExpenses } from '@/lib/useAbly'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

function TxRow({ e }: { e: MetricExpense }) {
  const c = catOf(e.cat)
  const dt = new Date(e.date + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  })
  return (
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
      <span className="amt">− {fmt(e.amt)}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const handleExpenseChange = useCallback((event: string, expense: any) => {
    if (event === 'add') {
      setExpenses((prev) => [
        {
          id: expense.id,
          date: expense.date,
          cat: expense.category,
          item: expense.item,
          amt: expense.amount,
        },
        ...prev,
      ])
    } else if (event === 'delete') {
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    }
  }, [])

  useAblyExpenses(userId, handleExpenseChange)

  useEffect(() => {
    Promise.all([
      fetch('/api/user')
        .then((r) => r.json())
        .then((d) => {
          if (d.name) setUserName(d.name)
          if (d.monthlyBudget) setBudget(d.monthlyBudget)
          if (d.savingsGoal) setGoal(d.savingsGoal)
          if (d.id) setUserId(d.id)
        })
        .catch(() => {}),
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
        .catch(() => {}),
    ]).finally(() => setIsLoading(false))
  }, [])

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const m = useMetrics(expenses, budget, goal)

  const h = now.getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const statusTxt = m.status === 'ok' ? 'On track' : m.status === 'warn' ? 'Slow down' : 'Danger zone'
  const firstName = userName.trim().split(/\s+/)[0] || userName

  if (isLoading) return <DashboardSkeleton />

  return (
    <div>
      <motion.div 
        className="rounded-2xl border border-[var(--line)] bg-gradient-to-r from-[var(--primary-soft)] to-transparent p-6 mb-6"
        {...stagger(0)}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1.5 mb-4">
              <I n="target" size={14} />
              <span className="text-xs font-semibold text-[var(--primary)]">Monthly overview</span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
              {greet}, {firstName}
            </h1>
            <p className="text-[var(--muted)]">
              Track your spending, reach your goals, and stay on top of your budget.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {userId && <NotificationsBell userId={userId} />}
            <AchievementsBadge />
            <span className={'pill ' + m.status}>
              <span className="dot" />
              {statusTxt}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div className="hero" {...stagger(1)}>
        <div>
          <div className="sts-label">
            <I n="target" size={14} /> Safe to spend today
          </div>
          <div className="sts-amount">
            <span className="cur">KES </span>
            {fmtN(m.safe)}
          </div>
          <div className="sts-note">
            {fmt(m.remaining)} remaining ÷ {m.daysLeft} days left, protecting your {fmt(goal)}{' '}
            savings goal.
          </div>
        </div>
        <div className="pace">
          <div>
            <div className="pace-top">
              <span>Month progress</span>
              <span className="mono">{Math.round(m.monthPace * 100)}%</span>
            </div>
            <div className="bar">
              <motion.span
                className="fill f-month"
                initial={{ width: 0 }}
                animate={{ width: m.monthPace * 100 + '%' }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div>
            <div className="pace-top">
              <span>Budget spent</span>
              <span className="mono">{Math.round(m.spendPace * 100)}%</span>
            </div>
            <div className="bar">
              <motion.span
                className={'fill f-' + m.status}
                initial={{ width: 0 }}
                animate={{ width: Math.min(100, m.spendPace * 100) + '%' }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        {[
          {
            t: 'Remaining',
            icon: 'wallet',
            v: fmt(m.remaining),
            d: `of ${fmt(budget)} budget`,
            cls: '',
          },
          {
            t: 'Spent this month',
            icon: 'trendUp',
            v: fmt(m.spent),
            d: `${Math.round(m.spendPace * 100)}% used · ${Math.round(m.monthPace * 100)}% of month gone`,
            cls: '',
          },
          {
            t: 'Spent today',
            icon: 'calendar',
            v: fmt(m.todaySpent),
            d:
              m.todaySpent > m.safe
                ? "Above today's safe amount"
                : "Within today's safe amount",
            cls: m.todaySpent > m.safe ? 'warnc' : 'okc',
          },
        ].map((k, i) => (
          <motion.div className="card" key={k.t} {...stagger(i + 2)}>
            <h3>
              <I n={k.icon} size={14} />
              {k.t}
            </h3>
            <div className="kpi">{k.v}</div>
            <div className={'delta ' + k.cls}>{k.d}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid cols-2">
        <motion.div className="card" {...stagger(5)}>
          <h3>
            <I n="chart" size={14} />
            Spend pace vs ideal
          </h3>
          <AreaChart cum={m.cum} budget={budget} status={m.status} daysInMonth={daysInMonth} />
        </motion.div>
        <motion.div className="card" {...stagger(6)}>
          <h3>
            <I n="receipt" size={14} />
            Recent expenses
          </h3>
          {m.recentTx.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '14px 0' }}>
              No expenses yet.
            </p>
          ) : (
            <div>
              {m.recentTx.map((e) => (
                <TxRow key={e.id} e={e} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
