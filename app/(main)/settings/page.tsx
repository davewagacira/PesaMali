'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { SuccessModal } from '@/components/SuccessModal'
import { PageHeroCard } from '@/components/PageHeroCard'
import { listContainer, listItem } from '@/lib/motion'
import { CATS } from '@/lib/metrics'

interface CategoryBudget {
  category: string
  limit: number
}

interface RecurringExpense {
  id: string
  category: string
  item: string
  amount: number
  frequency: string
  dayOfMonth?: number
  active: boolean
}

interface UserSettings {
  monthlyBudget?: number
  savingsGoal?: number
}

// Budgets can change month to month, so the user picks which month they're
// setting: the profile default, this month, or an upcoming month.
function budgetMonthOptions() {
  const now = new Date()
  const options: { value: string; label: string }[] = [
    { value: 'default', label: 'Default (all months)' },
  ]
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
    options.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: i === 0 ? `${label} (this month)` : label,
    })
  }
  return options
}

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true)
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [savingsGoal, setSavingsGoal] = useState('')
  const [budgetMonth, setBudgetMonth] = useState('default')
  const [budgetIsOverride, setBudgetIsOverride] = useState(false)
  const monthOptions = budgetMonthOptions()
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [newCategoryBudget, setNewCategoryBudget] = useState({ category: '', limit: '' })
  const [newRecurring, setNewRecurring] = useState({
    category: '',
    item: '',
    amount: '',
    frequency: 'monthly',
    dayOfMonth: '',
  })

  // Editing states
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryLimit, setEditingCategoryLimit] = useState('')

  const [editingRecurring, setEditingRecurring] = useState<string | null>(null)
  const [editingRecurringData, setEditingRecurringData] = useState({
    category: '',
    item: '',
    amount: '',
    frequency: 'monthly',
    dayOfMonth: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [profileId, setProfileId] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then((r) => r.json()),
      fetch('/api/profiles/current').then((r) => r.json()),
      fetch('/api/category-budgets').then((r) => r.json()),
      fetch('/api/recurring-expenses').then((r) => r.json()),
    ])
      .then(([userData, profileData, budgets, recurring]) => {
        if (userData.notificationsEnabled !== undefined) setNotificationsEnabled(userData.notificationsEnabled)
        if (userData.pushNotificationsEnabled !== undefined) setPushNotificationsEnabled(userData.pushNotificationsEnabled)
        if (profileData.id) setProfileId(profileData.id)
        const initBudget = profileData.defaultMonthlyBudget ?? profileData.monthlyBudget
        const initGoal = profileData.defaultSavingsGoal ?? profileData.savingsGoal
        if (initBudget !== undefined) setMonthlyBudget(initBudget.toString())
        if (initGoal !== undefined) setSavingsGoal(initGoal.toString())
        if (Array.isArray(budgets)) setCategoryBudgets(budgets)
        if (Array.isArray(recurring)) setRecurringExpenses(recurring)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const toggleNotifications = async () => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: !notificationsEnabled }),
      })
      setNotificationsEnabled(!notificationsEnabled)
      setSuccessMessage(notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const togglePushNotifications = async () => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushNotificationsEnabled: !pushNotificationsEnabled }),
      })
      setPushNotificationsEnabled(!pushNotificationsEnabled)
      setSuccessMessage(pushNotificationsEnabled ? 'Push notifications disabled' : 'Push notifications enabled')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const selectBudgetMonth = async (value: string) => {
    setBudgetMonth(value)
    try {
      if (value === 'default') {
        const p = await fetch('/api/profiles/current').then((r) => r.json())
        const b = p.defaultMonthlyBudget ?? p.monthlyBudget
        const g = p.defaultSavingsGoal ?? p.savingsGoal
        if (b !== undefined) setMonthlyBudget(b.toString())
        if (g !== undefined) setSavingsGoal(g.toString())
        setBudgetIsOverride(false)
      } else {
        const [year, month] = value.split('-')
        const d = await fetch(`/api/monthly-budgets?year=${year}&month=${month}`).then((r) => r.json())
        if (d.budget !== undefined) setMonthlyBudget(d.budget.toString())
        if (d.savingsGoal !== undefined) setSavingsGoal(d.savingsGoal.toString())
        setBudgetIsOverride(!!d.isOverride)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveBudgetGoals = async () => {
    if (!monthlyBudget && !savingsGoal) return
    if (!profileId) return
    try {
      if (budgetMonth === 'default') {
        const body: UserSettings = {}
        if (monthlyBudget) body.monthlyBudget = parseFloat(monthlyBudget)
        if (savingsGoal) body.savingsGoal = parseFloat(savingsGoal)
        await fetch(`/api/profiles/${profileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setSuccessMessage('Default budget and goals updated')
      } else {
        const [year, month] = budgetMonth.split('-')
        const body: { year: number; month: number; budget?: number; savingsGoal?: number } = {
          year: parseInt(year),
          month: parseInt(month),
        }
        if (monthlyBudget) body.budget = parseFloat(monthlyBudget)
        if (savingsGoal) body.savingsGoal = parseFloat(savingsGoal)
        const res = await fetch('/api/monthly-budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to save monthly budget')
        setBudgetIsOverride(true)
        const label = monthOptions.find((o) => o.value === budgetMonth)?.label || 'month'
        setSuccessMessage(`Budget for ${label.replace(' (this month)', '')} updated`)
      }
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const resetMonthBudget = async () => {
    if (budgetMonth === 'default') return
    try {
      const [year, month] = budgetMonth.split('-')
      const d = await fetch(`/api/monthly-budgets?year=${year}&month=${month}`, { method: 'DELETE' }).then((r) => r.json())
      if (d.budget !== undefined) setMonthlyBudget(d.budget.toString())
      if (d.savingsGoal !== undefined) setSavingsGoal(d.savingsGoal.toString())
      setBudgetIsOverride(false)
      setSuccessMessage('Month reverted to default budget')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const addCategoryBudget = async () => {
    if (!newCategoryBudget.category || !newCategoryBudget.limit) return

    try {
      const res = await fetch('/api/category-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategoryBudget.category,
          limit: parseFloat(newCategoryBudget.limit),
        }),
      })
      const budget = await res.json()
      if (!res.ok) throw new Error(budget.error || 'Failed to add budget')
      setCategoryBudgets((prev) =>
        prev.some((b) => b.category === budget.category)
          ? prev.map((b) => (b.category === budget.category ? budget : b))
          : [...prev, budget]
      )
      setNewCategoryBudget({ category: '', limit: '' })
      setSuccessMessage('Category budget set')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const saveCategoryBudget = async (category: string) => {
    if (!editingCategoryLimit) return
    try {
      const res = await fetch(`/api/category-budgets/${encodeURIComponent(category)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: parseFloat(editingCategoryLimit) }),
      })
      const budget = await res.json()
      if (!res.ok) throw new Error(budget.error || 'Failed to update budget')
      setCategoryBudgets((prev) => prev.map((b) => (b.category === category ? budget : b)))
      setEditingCategory(null)
      setSuccessMessage('Category budget updated')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const deleteCategoryBudget = async (category: string) => {
    try {
      await fetch(`/api/category-budgets/${encodeURIComponent(category)}`, { method: 'DELETE' })
      setCategoryBudgets((prev) => prev.filter((b) => b.category !== category))
      setSuccessMessage('Category budget removed')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const addRecurringExpense = async () => {
    if (!newRecurring.category || !newRecurring.item || !newRecurring.amount) return

    try {
      const res = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newRecurring.category,
          item: newRecurring.item,
          amount: parseFloat(newRecurring.amount),
          frequency: newRecurring.frequency,
          dayOfMonth: newRecurring.frequency === 'monthly' && newRecurring.dayOfMonth ? parseInt(newRecurring.dayOfMonth) : undefined,
        }),
      })
      const recurring = await res.json()
      if (!res.ok) throw new Error(recurring.error || 'Failed to add recurring expense')
      setRecurringExpenses((prev) => [...prev, recurring])
      setNewRecurring({ category: '', item: '', amount: '', frequency: 'monthly', dayOfMonth: '' })
      setSuccessMessage('Recurring expense added')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'An error occurred while adding the recurring expense')
    }
  }

  const toggleRecurringExpense = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      setRecurringExpenses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, active: !active } : r))
      )
    } catch (e) {
      console.error(e)
    }
  }

  const deleteRecurringExpense = async (id: string) => {
    try {
      await fetch(`/api/recurring-expenses/${id}`, { method: 'DELETE' })
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id))
      setSuccessMessage('Recurring expense removed')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const saveRecurringExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editingRecurringData.category,
          item: editingRecurringData.item,
          amount: parseFloat(editingRecurringData.amount),
          frequency: editingRecurringData.frequency,
          dayOfMonth: editingRecurringData.frequency === 'monthly' && editingRecurringData.dayOfMonth ? parseInt(editingRecurringData.dayOfMonth) : null,
        }),
      })
      const recurring = await res.json()
      if (!res.ok) throw new Error(recurring.error || 'Failed to update recurring expense')
      setRecurringExpenses((prev) => prev.map((r) => (r.id === id ? recurring : r)))
      setEditingRecurring(null)
      setSuccessMessage('Recurring expense updated')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
    }
  }

  const downloadReport = (format: 'pdf' | 'csv') => {
    const url = `/api/reports?format=${format}&month=${reportMonth}&year=${reportYear}`
    window.location.href = url
  }

  // Categories are stored as CATS ids (e.g. 'food') so budgets and recurring
  // expenses line up with logged expenses; legacy rows may hold display names.
  const catName = (id: string) => CATS.find((c) => c.id === id)?.name ?? id

  if (isLoading) return <PageHeroCard icon="settings" badge="Configuration" title="Settings" subtitle="Manage your budget, notifications, and preferences" />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="settings"
        badge="Configuration"
        title="Settings"
        subtitle="Manage your budget, notifications, and preferences"
      />

      {/* Budget & Goals */}
      <motion.div className="grid cols-1 gap-6 mb-6" variants={listItem}>
        <div className="card">
          <h3>
            <I n="wallet" size={14} />
            Budget & Goals
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Set your default budget, or a different budget for a specific month — it doesn&apos;t have to be the same every month
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-2">Applies To</label>
              <select
                value={budgetMonth}
                onChange={(e) => selectBudgetMonth(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {budgetMonth !== 'default' && (
                <p className="text-xs text-[var(--muted)] mt-1">
                  {budgetIsOverride
                    ? 'This month has its own budget'
                    : 'This month is currently using your default budget'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-2">Monthly Budget (KES)</label>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="e.g., 50000"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Your total spending limit for the month</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] uppercase mb-2">Savings Goal (KES)</label>
              <input
                type="number"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Amount you want to save each month</p>
            </div>

            <button
              onClick={saveBudgetGoals}
              disabled={!monthlyBudget && !savingsGoal}
              className="w-full rounded-lg [background:var(--primary-grad)] px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              {budgetMonth === 'default' ? 'Save Default Budget & Goals' : 'Save Budget for This Month'}
            </button>
            {budgetMonth !== 'default' && budgetIsOverride && (
              <button
                onClick={resetMonthBudget}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)] active:scale-95"
              >
                Revert This Month to Default
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div className="grid cols-1 gap-6 mb-6" variants={listItem}>
        <div className="card">
          <h3>
            <I n="bell" size={14} />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">In-app Notifications</h4>
                <p className="text-xs text-[var(--muted)] mt-1">Receive alerts about budget and achievements</p>
              </div>
              <button
                className={'switch' + (notificationsEnabled ? ' on' : '')}
                onClick={toggleNotifications}
                aria-label="Toggle in-app notifications"
              >
                <motion.span
                  className="knob"
                  animate={{ x: notificationsEnabled ? 18 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Push Notifications</h4>
                <p className="text-xs text-[var(--muted)] mt-1">Browser notifications for urgent alerts</p>
              </div>
              <button
                className={'switch' + (pushNotificationsEnabled ? ' on' : '')}
                onClick={togglePushNotifications}
                aria-label="Toggle push notifications"
              >
                <motion.span
                  className="knob"
                  animate={{ x: pushNotificationsEnabled ? 18 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Budgets */}
      <motion.div className="grid cols-1 gap-6 mb-6" variants={listItem}>
        <div className="card">
          <h3>
            <I n="target" size={14} />
            Category Budgets
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">Set spending limits for each category</p>

          <div className="mb-6 space-y-2">
            {categoryBudgets.map((budget) => (
              <div key={budget.category} className="flex items-center justify-between rounded-lg bg-[var(--bg)] p-3">
                {editingCategory === budget.category ? (
                  <div className="flex-1 flex gap-3 mr-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{catName(budget.category)}</h4>
                      <input
                        type="number"
                        value={editingCategoryLimit}
                        onChange={(e) => setEditingCategoryLimit(e.target.value)}
                        className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-sm">{catName(budget.category)}</h4>
                    <p className="text-xs text-[var(--muted)]">KES {budget.limit.toLocaleString()}</p>
                  </div>
                )}
                <div className="flex gap-2 shrink-0">
                  {editingCategory === budget.category ? (
                    <>
                      <button onClick={() => saveCategoryBudget(budget.category)} className="p-2 rounded bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition">
                        <I n="check" size={16} />
                      </button>
                      <button onClick={() => setEditingCategory(null)} className="p-2 rounded bg-[var(--card-2)] hover:bg-[var(--line)] transition">
                        <I n="x" size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingCategory(budget.category); setEditingCategoryLimit(budget.limit.toString()); }} className="p-2 rounded hover:bg-[var(--card-2)] text-[var(--muted)] hover:text-[var(--text)] transition">
                        <I n="edit" size={16} />
                      </button>
                      <button onClick={() => deleteCategoryBudget(budget.category)} className="p-2 rounded hover:bg-[var(--red-soft)] text-[var(--muted)] hover:text-[var(--red)] transition">
                        <I n="trash" size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <select
              value={newCategoryBudget.category}
              onChange={(e) => setNewCategoryBudget({ ...newCategoryBudget, category: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">Select category...</option>
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newCategoryBudget.limit}
              onChange={(e) => setNewCategoryBudget({ ...newCategoryBudget, limit: e.target.value })}
              placeholder="Budget limit (KES)"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
            <button
              onClick={addCategoryBudget}
              disabled={!newCategoryBudget.category || !newCategoryBudget.limit}
              className="w-full rounded-lg [background:var(--primary-grad)] px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              Add Budget
            </button>
          </div>
        </div>
      </motion.div>

      {/* Recurring Expenses */}
      <motion.div className="grid cols-1 gap-6 mb-6" variants={listItem}>
        <div className="card">
          <h3>
            <I n="repeat" size={14} />
            Recurring Expenses
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">Set up bills and subscriptions that repeat monthly</p>

          <div className="mb-6 space-y-2">
            {recurringExpenses.map((recurring) => (
              <div
                key={recurring.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg bg-[var(--bg)] p-3 gap-3"
              >
                {editingRecurring === recurring.id ? (
                  <div className="flex-1 grid gap-2 w-full">
                    <input type="text" value={editingRecurringData.item} onChange={(e) => setEditingRecurringData({ ...editingRecurringData, item: e.target.value })} placeholder="Item name" className="rounded border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]" />
                    <div className="flex gap-2">
                      <input type="number" value={editingRecurringData.amount} onChange={(e) => setEditingRecurringData({ ...editingRecurringData, amount: e.target.value })} placeholder="Amount" className="w-1/3 rounded border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]" />
                      <select value={editingRecurringData.frequency} onChange={(e) => setEditingRecurringData({ ...editingRecurringData, frequency: e.target.value })} className="w-1/3 rounded border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                      </select>
                      {editingRecurringData.frequency === 'monthly' && (
                        <input type="number" min="1" max="31" placeholder="Day (1-31)" value={editingRecurringData.dayOfMonth} onChange={(e) => setEditingRecurringData({ ...editingRecurringData, dayOfMonth: e.target.value })} className="w-1/3 rounded border border-[var(--line)] bg-[var(--card-2)] px-2 py-1 text-sm outline-none focus:border-[var(--primary)]" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{recurring.item}</h4>
                    <p className="text-xs text-[var(--muted)]">
                      {catName(recurring.category)} • KES {recurring.amount.toLocaleString()} • {recurring.frequency}
                      {recurring.frequency === 'monthly' && recurring.dayOfMonth ? ` (Day ${recurring.dayOfMonth})` : ''}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                  {editingRecurring === recurring.id ? (
                    <>
                      <button onClick={() => saveRecurringExpense(recurring.id)} className="p-2 rounded bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition">
                        <I n="check" size={16} />
                      </button>
                      <button onClick={() => setEditingRecurring(null)} className="p-2 rounded bg-[var(--card-2)] hover:bg-[var(--line)] transition">
                        <I n="x" size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleRecurringExpense(recurring.id, recurring.active)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition ${
                          recurring.active
                            ? 'bg-[var(--green-soft)] text-[var(--green)]'
                            : 'bg-[var(--muted)] opacity-50 text-[var(--text)]'
                        }`}
                      >
                        {recurring.active ? 'Active' : 'Paused'}
                      </button>
                      <button onClick={() => { setEditingRecurring(recurring.id); setEditingRecurringData({ category: recurring.category, item: recurring.item, amount: recurring.amount.toString(), frequency: recurring.frequency, dayOfMonth: recurring.dayOfMonth?.toString() || '' }); }} className="p-2 rounded hover:bg-[var(--card-2)] text-[var(--muted)] hover:text-[var(--text)] transition">
                        <I n="edit" size={16} />
                      </button>
                      <button
                        onClick={() => deleteRecurringExpense(recurring.id)}
                        className="p-2 rounded hover:bg-[var(--red-soft)] text-[var(--muted)] hover:text-[var(--red)] transition"
                      >
                        <I n="trash" size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <select
              value={newRecurring.category}
              onChange={(e) => setNewRecurring({ ...newRecurring, category: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">Select category...</option>
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newRecurring.item}
              onChange={(e) => setNewRecurring({ ...newRecurring, item: e.target.value })}
              placeholder="Item name (e.g., Netflix, Rent)"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
            <input
              type="number"
              value={newRecurring.amount}
              onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
              placeholder="Amount (KES)"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
            <select
              value={newRecurring.frequency}
              onChange={(e) => setNewRecurring({ ...newRecurring, frequency: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
            </select>
            {newRecurring.frequency === 'monthly' && (
              <input
                type="number"
                min="1"
                max="31"
                value={newRecurring.dayOfMonth}
                onChange={(e) => setNewRecurring({ ...newRecurring, dayOfMonth: e.target.value })}
                placeholder="Day of month (e.g., 6)"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
            )}
            <button
              onClick={addRecurringExpense}
              disabled={!newRecurring.category || !newRecurring.item || !newRecurring.amount}
              className="w-full rounded-lg [background:var(--primary-grad)] px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              Add Recurring Expense
            </button>
          </div>
        </div>
      </motion.div>

      {/* Reports */}
      <motion.div className="grid cols-1 gap-6" variants={listItem}>
        <div className="card">
          <h3>
            <I n="barChart" size={14} />
            Download Reports
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">Export your spending data as PDF or CSV</p>

          <div className="space-y-4">
            <div className="grid cols-2 gap-3">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(parseInt(e.target.value))}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2024, m - 1).toLocaleDateString('en-KE', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] py-2 pl-4 pr-10 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid cols-2 gap-3">
              <button
                onClick={() => downloadReport('pdf')}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
              >
                <I n="file" size={16} />
                PDF
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-4 py-2 font-semibold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
              >
                <I n="sheet" size={16} />
                CSV
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <SuccessModal
        isOpen={showSuccess}
        title="Success!"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </motion.div>
  )
}
