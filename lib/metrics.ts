import { useMemo } from 'react'

export const CATS = [
  { id: 'food', name: 'Food', icon: 'utensils', color: '#4F46E5' },
  { id: 'transport', name: 'Transport', icon: 'bus', color: '#0EA5E9' },
  { id: 'rent', name: 'Rent', icon: 'home', color: '#8B5CF6' },
  { id: 'airtime', name: 'Airtime', icon: 'phone', color: '#10B981' },
  { id: 'internet', name: 'Internet', icon: 'wifi', color: '#06B6D4' },
  { id: 'electricity', name: 'Electricity', icon: 'zap', color: '#EAB308' },
  { id: 'water', name: 'Water', icon: 'droplet', color: '#3B82F6' },
  { id: 'fun', name: 'Leisure', icon: 'film', color: '#F59E0B' },
  { id: 'shopping', name: 'Shopping', icon: 'shoppingBag', color: '#EC4899' },
  { id: 'grocery', name: 'Grocery', icon: 'basket', color: '#22C55E' },
  { id: 'other', name: 'Other', icon: 'receipt', color: '#94A3B8' },
]

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const iso = (dt: Date) => {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
export const fmtN = (n: number) => Math.round(n).toLocaleString('en-KE')
export const fmt = (n: number) => 'KES ' + fmtN(n)
export const catOf = (id: string) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1]

export interface MetricExpense {
  id: string
  date: string
  cat: string
  item: string
  amt: number
}

export interface Metrics {
  spent: number
  remaining: number
  daysLeft: number
  safe: number          // how much MORE you can spend today (resets daily)
  dailyAllowance: number // full daily allowance for today before any spending
  todaySpent: number
  spendPace: number
  monthPace: number
  status: 'ok' | 'warn' | 'danger'
  last7: { label: string; amt: number; today: boolean }[]
  byCat: { id: string; name: string; icon: string; color: string; amt: number }[]
  topItems: { name: string; n: number; amt: number }[]
  dowOrdered: { label: string; amt: number }[]
  cum: { day: number; spent: number; ideal: number }[]
  daysWithSpend: number
  projected: number
  recentTx: MetricExpense[]
}

export function useMetrics(expenses: MetricExpense[], budget: number, goal: number, now: Date = new Date()): Metrics {
  const todayKey = iso(now)
  return useMemo(() => {
    const Y = now.getFullYear()
    const Mn = now.getMonth()
    const daysInMonth = new Date(Y, Mn + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const dKey = (day: number) => iso(new Date(Y, Mn, Math.min(day, dayOfMonth)))

    const today = todayKey
    const spent = expenses.reduce((s, e) => s + e.amt, 0)
    const remaining = budget - spent
    const daysLeft = daysInMonth - dayOfMonth + 1
    const todaySpent = expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amt, 0)
    // Daily allowance is based on prior days only so it resets fresh each morning.
    // safe = what you can still spend today (goes down as you spend, goes negative if over).
    const priorSpent = spent - todaySpent
    const dailyAllowance = Math.max(0, (budget - priorSpent - goal) / daysLeft)
    const safe = dailyAllowance - todaySpent
    const spendPace = spent / budget
    const monthPace = dayOfMonth / daysInMonth
    const status: 'ok' | 'warn' | 'danger' =
      spendPace <= monthPace ? 'ok' : spendPace <= monthPace * 1.15 ? 'warn' : 'danger'

    const last7: { label: string; amt: number; today: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Y, Mn, dayOfMonth - i)
      const k = iso(dt)
      last7.push({
        label: DOW[dt.getDay()],
        amt: expenses.filter((e) => e.date === k).reduce((s, e) => s + e.amt, 0),
        today: i === 0,
      })
    }

    const byCat = CATS.map((c) => ({
      ...c,
      amt: expenses.filter((e) => e.cat === c.id).reduce((s, e) => s + e.amt, 0),
    }))
      .filter((c) => c.amt > 0)
      .sort((a, b) => b.amt - a.amt)

    const counts: Record<string, { n: number; amt: number; name: string }> = {}
    expenses.forEach((e) => {
      const k = e.item.toLowerCase()
      counts[k] = counts[k] || { n: 0, amt: 0, name: e.item }
      counts[k].n++
      counts[k].amt += e.amt
    })
    const topItems = Object.values(counts).sort((a, b) => b.n - a.n)

    const byDow = DOW.map((l) => ({ label: l, amt: 0 }))
    expenses.forEach((e) => {
      byDow[new Date(e.date + 'T00:00:00').getDay()].amt += e.amt
    })
    const dowOrdered = [...byDow.slice(1), byDow[0]]

    const cum: { day: number; spent: number; ideal: number }[] = []
    let run = 0
    for (let d = 1; d <= dayOfMonth; d++) {
      run += expenses.filter((e) => e.date === dKey(d)).reduce((s, e) => s + e.amt, 0)
      cum.push({ day: d, spent: run, ideal: (budget * d) / daysInMonth })
    }

    const daysWithSpend = new Set(expenses.map((e) => e.date)).size || 1
    const projected = (spent / dayOfMonth) * daysInMonth
    const recentTx = [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 6)

    return {
      spent,
      remaining,
      daysLeft,
      safe,
      dailyAllowance,
      todaySpent,
      spendPace,
      monthPace,
      status,
      last7,
      byCat,
      topItems,
      dowOrdered,
      cum,
      daysWithSpend,
      projected,
      recentTx,
    }
  }, [expenses, budget, goal, todayKey])
}
