'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { AreaChart } from '@/components/Charts'
import { PageHeroCard } from '@/components/PageHeroCard'
import { useMetrics, fmt, fmtN, catOf, MetricExpense } from '@/lib/metrics'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { AchievementsBadge } from '@/components/AchievementsBadge'
import { useAblyExpenses } from '@/lib/useAbly'
import { listContainer, listItem } from '@/lib/motion'

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
  const [catBudgets, setCatBudgets] = useState<{ category: string; limit: number }[]>([])
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
      fetch('/api/category-budgets')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setCatBudgets(d)
        })
        .catch(() => {}),
    ]).finally(() => setIsLoading(false))
  }, [])

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const m = useMetrics(expenses, budget, goal)

  // Envelope view: what's left of each allocation, most-depleted first
  const envelopes = catBudgets
    .map((b) => {
      const c = catOf(b.category)
      const spent = expenses.filter((e) => e.cat === b.category).reduce((s, e) => s + e.amt, 0)
      return { ...b, c, spent, remaining: b.limit - spent, pct: spent / b.limit }
    })
    .sort((a, b) => b.pct - a.pct)

  const h = now.getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const statusTxt = m.status === 'ok' ? 'On track' : m.status === 'warn' ? 'Slow down' : 'Danger zone'
  const firstName = userName.trim().split(/\s+/)[0] || userName

  if (isLoading) return <DashboardSkeleton />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="target"
        badge="Monthly overview"
        title={`${greet}, ${firstName}`}
        subtitle="Track your spending, reach your goals, and stay on top of your budget."
      >
        <div className="flex items-center gap-3 shrink-0">
          <AchievementsBadge />
          <span className={'pill ' + m.status}>
            <span className="dot" />
            {statusTxt}
          </span>
        </div>
      </PageHeroCard>

      <motion.div className="hero" variants={listItem}>
        <div>
          <div className="sts-label">
            <I n="target" size={14} />{' '}
            {m.safe < 0 ? 'Overspent today' : 'Safe to spend today'}
          </div>
          <div className="sts-amount" style={m.safe < 0 ? { color: 'var(--red)' } : undefined}>
            <span className="cur">KES </span>
            {fmtN(Math.abs(m.safe))}
          </div>
          <div className="sts-note">
            {m.safe < 0
              ? `${fmt(m.dailyAllowance)} daily allowance · ${fmt(-m.safe)} over today`
              : `${fmt(m.dailyAllowance)} daily allowance · ${fmt(m.todaySpent)} spent today · ${m.daysLeft} days left`}
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
                style={{ width: m.monthPace * 100 + '%', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
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
                style={{ width: Math.min(100, m.spendPace * 100) + '%', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className="grid cols-3" style={{ marginBottom: 16 }} variants={listContainer}>
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
        ].map((k) => (
          <motion.div className="card" key={k.t} variants={listItem}>
            <h3>
              <I n={k.icon} size={14} />
              {k.t}
            </h3>
            <div className="kpi">{k.v}</div>
            <div className={'delta ' + k.cls}>{k.d}</div>
          </motion.div>
        ))}
      </motion.div>

      {envelopes.length > 0 && (
        <motion.div className="card" style={{ marginBottom: 16 }} variants={listItem}>
          <h3>
            <I n="wallet" size={14} />
            Category envelopes
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>
            What&apos;s left of the money you allocated to each category this month.
          </p>
          {envelopes.map((env) => (
            <div key={env.category} style={{ padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: env.c.color, display: 'flex' }}>
                    <I n={env.c.icon} size={15} />
                  </span>
                  <b style={{ fontSize: 13 }}>{env.c.name}</b>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    fontWeight: env.remaining < 0 ? 700 : 500,
                    color: env.remaining < 0 ? 'var(--red)' : 'var(--muted)',
                  }}
                >
                  {env.remaining < 0
                    ? `Depleted · −${fmt(-env.remaining)} over`
                    : `${fmt(env.remaining)} left`}
                </span>
              </div>
              <div className="bar">
                <span
                  className={
                    'fill ' + (env.pct >= 1 ? 'f-danger' : env.pct >= 0.8 ? 'f-warn' : 'f-ok')
                  }
                  style={{ width: Math.min(100, env.pct * 100) + '%' }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {fmt(env.spent)} spent of {fmt(env.limit)} allocated
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div className="grid cols-2" variants={listContainer}>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="chart" size={14} />
            Spend pace vs ideal
          </h3>
          <AreaChart cum={m.cum} budget={budget} status={m.status} daysInMonth={daysInMonth} />
        </motion.div>
        <motion.div className="card" variants={listItem}>
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
      </motion.div>
    </motion.div>
  )
}
