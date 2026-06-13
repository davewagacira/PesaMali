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
      fetch('/api/profiles/current')
        .then((r) => r.json())
        .then((d) => {
          if (d.monthlyBudget !== undefined) setBudget(d.monthlyBudget)
          if (d.savingsGoal !== undefined) setGoal(d.savingsGoal)
        })
        .catch(() => {}),
      fetch('/api/expenses')
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

  const totalExpenses = expenses.length
  const uniqueCategories = new Set(expenses.map((e) => e.cat)).size
  const maxSingle = expenses.length ? Math.max(...expenses.map((e) => e.amt)) : 0
  const smallWinsCount = expenses.filter((e) => e.amt < 50).length
  const hasWeekendLog = expenses.some((e) => { const d = new Date(e.date); return d.getDay() === 0 || d.getDay() === 6 })
  const fixedFree = expenses.length > 0 && expenses.every((e) => !e.fixed)
  const flexSpent = expenses.filter((e) => !e.fixed).reduce((s, e) => s + e.amt, 0)
  const foodAmt = expenses.filter((e) => /food|eat|lunch|dinner|breakfast|snack|groceries/i.test(e.cat)).reduce((s, e) => s + e.amt, 0)
  const foodFrugal = flexSpent > 0 && foodAmt / flexSpent < 0.3

  const achs = [
    // — Tracking milestones —
    { icon: 'sprout',     t: 'First shilling tracked', p: 'Log your very first expense.',                          ok: totalExpenses >= 1 },
    { icon: 'listChecks', t: 'Getting started',        p: 'Log 5 expenses total.',                                 ok: totalExpenses >= 5 },
    { icon: 'book',       t: 'Bookkeeper',             p: 'Log expenses on 7 different days.',                     ok: daysLogged >= 7 },
    { icon: 'flame',      t: 'Two-week streak',        p: 'Log expenses on 14 different days.',                    ok: daysLogged >= 14 },
    { icon: 'calendar',   t: 'Monthly logger',         p: 'Log expenses on 25 different days.',                    ok: daysLogged >= 25 },
    { icon: 'layers',     t: 'Dedicated tracker',      p: 'Log 50 expenses in total.',                             ok: totalExpenses >= 50 },
    { icon: 'sheet',      t: 'Power user',             p: 'Log 100 expenses in total.',                            ok: totalExpenses >= 100 },
    { icon: 'chart',      t: 'Category explorer',      p: 'Log expenses across 5 different categories.',           ok: uniqueCategories >= 5 },
    { icon: 'barChart2',  t: 'Well-rounded',           p: 'Log expenses across 8 different categories.',           ok: uniqueCategories >= 8 },
    { icon: 'zap',        t: 'Weekend warrior',        p: 'Track spending on a weekend day.',                      ok: hasWeekendLog },
    // — Budget & savings —
    { icon: 'shield',     t: 'Under-budget week',      p: 'Spend less in 7 days than your weekly budget share.',  ok: wkTotal > 0 && wkTotal <= weeklyBudget },
    { icon: 'check',      t: 'Green keeper',           p: 'Hold the on-track status right now.',                  ok: m.status === 'ok' },
    { icon: 'piggy',      t: 'Saver in the making',    p: 'Keep your remaining balance above your savings goal.', ok: m.remaining >= goal },
    { icon: 'trendUp',    t: 'First surplus',          p: 'Have money remaining mid-month.',                      ok: m.remaining > 0 },
    { icon: 'wallet',     t: 'Cushioned',              p: 'Keep KES 5,000+ remaining in your budget.',            ok: m.remaining >= 5000 },
    { icon: 'star',       t: 'Savings champion',       p: 'Keep remaining balance at 2× your savings goal.',      ok: goal > 0 && m.remaining >= goal * 2 },
    { icon: 'medal',      t: 'Goal achieved',          p: 'Hit your savings goal for the month.',                 ok: goal > 0 && m.remaining >= goal },
    { icon: 'flag',       t: 'Month finisher',         p: 'End a month with money left over.',                    ok: false },
    { icon: 'crown',      t: 'PesaMali master',        p: 'Finish 3 months in a row under budget.',               ok: false },
    // — Spending habits —
    { icon: 'coins',      t: 'Cheap day champion',     p: 'Have a day where you spend under KES 100.',            ok: cheapDay },
    { icon: 'receipt',    t: 'Big ticket',             p: 'Log a single expense over KES 5,000.',                 ok: maxSingle > 5000 },
    { icon: 'scissors',   t: 'Micro manager',          p: 'Log 5 expenses each under KES 50.',                    ok: smallWinsCount >= 5 },
    { icon: 'leaf',       t: 'Food frugal',            p: 'Keep food spending below 30% of flexible spend.',      ok: foodFrugal },
    { icon: 'percent',    t: 'Half-budget hero',       p: 'Reach mid-month having spent under 40% of budget.',    ok: now.getDate() >= 14 && m.spent / Math.max(budget, 1) < 0.4 },
    { icon: 'target',     t: 'Laser focused',          p: 'Spend in only 1 category across 7+ logged days.',      ok: uniqueCategories === 1 && daysLogged >= 7 },
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
