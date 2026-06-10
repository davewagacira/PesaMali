'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { I } from '@/components/Icons'
import { SuccessModal } from '@/components/SuccessModal'
import { PageHeroCard } from '@/components/PageHeroCard'
import { listContainer, listItem } from '@/lib/motion'

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
  active: boolean
}

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true)
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [newCategoryBudget, setNewCategoryBudget] = useState({ category: '', limit: '' })
  const [newRecurring, setNewRecurring] = useState({
    category: '',
    item: '',
    amount: '',
    frequency: 'monthly',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then((r) => r.json()),
      fetch('/api/category-budgets').then((r) => r.json()),
      fetch('/api/recurring-expenses').then((r) => r.json()),
    ])
      .then(([userData, budgets, recurring]) => {
        if (userData.notificationsEnabled !== undefined) setNotificationsEnabled(userData.notificationsEnabled)
        if (userData.pushNotificationsEnabled !== undefined) setPushNotificationsEnabled(userData.pushNotificationsEnabled)
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
        }),
      })
      const recurring = await res.json()
      setRecurringExpenses((prev) => [...prev, recurring])
      setNewRecurring({ category: '', item: '', amount: '', frequency: 'monthly' })
      setSuccessMessage('Recurring expense added')
      setShowSuccess(true)
    } catch (e) {
      console.error(e)
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

  const downloadReport = (format: 'pdf' | 'csv') => {
    const url = `/api/reports?format=${format}&month=${reportMonth}&year=${reportYear}`
    window.location.href = url
  }

  const categories = ['Food', 'Transport', 'Rent', 'Entertainment', 'Utilities', 'Health', 'Airtime', 'Shopping', 'Other']

  if (isLoading) return <PageHeroCard icon="settings" badge="Configuration" title="Settings" subtitle="Manage your budget, notifications, and preferences" />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="settings"
        badge="Configuration"
        title="Settings"
        subtitle="Manage your budget, notifications, and preferences"
      />

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
                onClick={toggleNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  notificationsEnabled ? 'bg-[var(--green)]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Push Notifications</h4>
                <p className="text-xs text-[var(--muted)] mt-1">Browser notifications for urgent alerts</p>
              </div>
              <button
                onClick={togglePushNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  pushNotificationsEnabled ? 'bg-[var(--green)]' : 'bg-[var(--line)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    pushNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
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
                <div>
                  <h4 className="font-semibold text-sm">{budget.category}</h4>
                  <p className="text-xs text-[var(--muted)]">KES {budget.limit.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => deleteCategoryBudget(budget.category)}
                  className="p-2 rounded hover:bg-[var(--red-soft)] text-[var(--muted)] hover:text-[var(--red)] transition"
                >
                  <I n="trash" size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <select
              value={newCategoryBudget.category}
              onChange={(e) => setNewCategoryBudget({ ...newCategoryBudget, category: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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
                className="flex items-center justify-between rounded-lg bg-[var(--bg)] p-3"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{recurring.item}</h4>
                  <p className="text-xs text-[var(--muted)]">
                    {recurring.category} • KES {recurring.amount.toLocaleString()} • {recurring.frequency}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
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
                  <button
                    onClick={() => deleteRecurringExpense(recurring.id)}
                    className="p-2 rounded hover:bg-[var(--red-soft)] text-[var(--muted)] hover:text-[var(--red)] transition"
                  >
                    <I n="trash" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <select
              value={newRecurring.category}
              onChange={(e) => setNewRecurring({ ...newRecurring, category: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
            </select>
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
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
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
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
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
