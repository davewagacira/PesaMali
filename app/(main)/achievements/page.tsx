'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'
import { useMetrics, MetricExpense } from '@/lib/metrics'
import { AchievementsSkeleton } from '@/components/AchievementsSkeleton'
import { listContainer, listItem } from '@/lib/motion'

export default function AchievementsPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/user')
        .then((r) => r.json())
        .then((d) => {
          if (d.monthlyBudget) setBudget(d.monthlyBudget)
          if (d.savingsGoal) setGoal(d.savingsGoal)
        })
        .catch(() => {}),
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
        .catch(() => {}),
    ]).finally(() => setIsLoading(false))
  }, [])

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const m = useMetrics(expenses, budget, goal)

  const daysLogged = new Set(expenses.map((e) => e.date)).size
  const wkTotal = m.last7.reduce((s, o) => s + o.amt, 0)
  const weeklyBudget = (budget / daysInMonth) * 7
  const byDay: Record<string, number> = {}
  expenses.forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + e.amt })
  const cheapDay = Object.values(byDay).some((v) => v > 0 && v < 100)

  const achs = [
    { icon: 'sprout', t: 'First shilling tracked', p: 'Log your very first expense.', ok: expenses.length >= 1 },
    { icon: 'book', t: 'Bookkeeper', p: 'Log expenses on 7 different days.', ok: daysLogged >= 7 },
    { icon: 'flame', t: 'Two-week streak', p: 'Log expenses on 14 different days.', ok: daysLogged >= 14 },
    { icon: 'shield', t: 'Under-budget week', p: 'Spend less in 7 days than your weekly budget share.', ok: wkTotal > 0 && wkTotal <= weeklyBudget },
    { icon: 'check', t: 'Green keeper', p: 'Hold the on-track status right now.', ok: m.status === 'ok' },
    { icon: 'piggy', t: 'Saver in the making', p: 'Keep your remaining balance above your savings goal.', ok: m.remaining >= goal },
    { icon: 'coins', t: 'Cheap day champion', p: 'Have a day where you spend under KES 100.', ok: cheapDay },
    { icon: 'flag', t: 'Month finisher', p: 'End a month with money left over.', ok: false },
    { icon: 'crown', t: 'PesaMali master', p: 'Finish 3 months in a row under budget.', ok: false },
  ]
  const n = achs.filter((a) => a.ok).length

  if (isLoading) return <AchievementsSkeleton />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="trophy"
        badge="Milestones"
        title="Achievements"
        subtitle="Discipline, rewarded"
      >
        <span className="pill ok">
          <I n="trophy" size={13} />
          {n} / {achs.length} unlocked
        </span>
      </PageHeroCard>
      <motion.div className="ach-grid" variants={listContainer}>
        {achs.map((a) => (
          <motion.div
            key={a.t}
            className={'ach ' + (a.ok ? 'unlocked' : 'locked')}
            variants={listItem}
            whileHover={a.ok ? { y: -4 } : {}}
          >
            <div className="ic-wrap">
              <I n={a.ok ? a.icon : 'lock'} size={20} />
            </div>
            <b>{a.t}</b>
            <p>{a.p}</p>
            <span className="tag">{a.ok ? 'UNLOCKED' : 'LOCKED'}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
