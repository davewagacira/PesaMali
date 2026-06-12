'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'
import { ConfirmModal } from '@/components/ConfirmModal'
import { fmt, iso, useMetrics, MetricExpense, Metrics } from '@/lib/metrics'
import { listContainer, listItem } from '@/lib/motion'

interface WishItem {
  id: string
  name: string
  price: number
}

type VerdictTone = 'ok' | 'warn' | 'danger'

interface Verdict {
  tone: VerdictTone
  label: string
  detail: string
}

const TONE_COLORS: Record<VerdictTone, string> = {
  ok: 'var(--green, #16A34A)',
  warn: 'var(--amber, #D97706)',
  danger: 'var(--red, #DC2626)',
}

// The four-tier affordability check. "Comfortable" means the purchase fits in
// what current habits are projected to leave over at month end after savings;
// the other tiers progressively trade daily allowance, then savings, then fail.
function judgePurchase(price: number, m: Metrics, budget: number, goal: number): Verdict {
  const afterGoal = m.remaining - goal
  const projectedLeftover = budget - m.projected - goal
  const newDaily = Math.max(0, (m.remaining - price - goal) / Math.max(m.daysLeft, 1))

  if (price <= projectedLeftover) {
    return {
      tone: 'ok',
      label: 'Comfortable',
      detail: `Fits without changing your habits. At your current pace you'd still end the month with ${fmt(projectedLeftover - price)} to spare after savings.`,
    }
  }
  if (price <= afterGoal) {
    return {
      tone: 'warn',
      label: 'Tight but doable',
      detail: `You can afford it, but your daily guide drops from ${fmt(m.dailyAllowance)} to ${fmt(newDaily)} for the remaining ${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'}.`,
    }
  }
  if (price <= m.remaining) {
    return {
      tone: 'danger',
      label: 'Eats your savings',
      detail: `Only possible by taking ${fmt(price - Math.max(afterGoal, 0))} out of your ${fmt(goal)} savings goal this month. Better next month?`,
    }
  }
  return {
    tone: 'danger',
    label: 'Not this month',
    detail: `That's ${fmt(price - Math.max(m.remaining, 0))} more than you have left. Park it here and check again after your next budget.`,
  }
}

function VerdictChip({ v }: { v: Verdict }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: TONE_COLORS[v.tone],
        background: 'color-mix(in srgb, currentColor 12%, transparent)',
        whiteSpace: 'nowrap',
      }}
    >
      <I n={v.tone === 'ok' ? 'check' : v.tone === 'warn' ? 'flag' : 'alert'} size={12} />
      {v.label}
    </span>
  )
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([])
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [buyItem, setBuyItem] = useState<WishItem | null>(null)
  const [removeItem, setRemoveItem] = useState<WishItem | null>(null)
  const now = useMemo(() => new Date(), [])

  const m = useMetrics(expenses, budget, goal, now)

  const ping = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

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
                id: e.id,
                date: e.date,
                cat: e.category,
                item: e.item,
                amt: e.amount, fixed: e.fixed,
              }))
            )
          }
        })
        .catch(() => {}),
      fetch('/api/wishlist')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setItems(d)
        })
        .catch(() => {}),
    ]).finally(() => setIsLoading(false))
  }, [])

  const addItem = async () => {
    if (isSaving) return
    const p = parseFloat(price)
    if (!name.trim()) return ping('Give the item a name')
    if (!p || p <= 0) return ping('Enter a valid price')
    setIsSaving(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price: p }),
      })
      const data = await res.json()
      if (res.ok) {
        setItems((prev) => [data, ...prev])
        setName('')
        setPrice('')
      } else {
        ping(data.error || 'Failed to save')
      }
    } catch {
      ping('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteItem = async (item: WishItem) => {
    try {
      const res = await fetch(`/api/wishlist/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      } else {
        ping('Failed to remove')
      }
    } catch {
      ping('Failed to remove')
    }
  }

  const buyAndLog = async (item: WishItem) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: iso(new Date()), category: 'shopping', item: item.name, amount: item.price }),
      })
      if (!res.ok) {
        const data = await res.json()
        return ping(data.error || 'Failed to log expense')
      }
      const created = await res.json()
      setExpenses((prev) => [
        ...prev,
        { id: created.id, date: created.date, cat: created.category, item: created.item, amt: created.amount },
      ])
      await deleteItem(item)
      ping(`${item.name} logged as an expense`)
    } catch {
      ping('Failed to log expense')
    }
  }

  const previewPrice = parseFloat(price)
  const preview = !isLoading && previewPrice > 0 ? judgePurchase(previewPrice, m, budget, goal) : null
  const afterGoal = m.remaining - goal
  const wishTotal = items.reduce((s, i) => s + i.price, 0)

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="target"
        badge="Wishlist"
        title="Plan a purchase"
        subtitle="Park the things you want, see what buying them would do to your month."
      />
      <motion.div className="log-grid" variants={listContainer}>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="plusCircle" size={14} />
            Something you want
          </h3>
          <div className="field">
            <label>Item</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Headphones, sneakers" />
          </div>
          <div className="field">
            <label>Price (KES)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="1"
              placeholder="e.g. 3500"
              onKeyDown={(e) => e.key === 'Enter' && !isSaving && addItem()}
            />
          </div>
          {preview && (
            <div style={{ margin: '2px 0 12px', display: 'grid', gap: 6 }}>
              <VerdictChip v={preview} />
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{preview.detail}</p>
            </div>
          )}
          <motion.button className="btn btn-primary" whileTap={{ scale: 0.97 }} onClick={addItem} disabled={isSaving}>
            <I n="plusCircle" size={16} />
            {isSaving ? 'Saving...' : 'Add to wishlist'}
          </motion.button>
          {!isLoading && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>
              You have {fmt(Math.max(afterGoal, 0))} available after your savings goal · {fmt(m.dailyAllowance)} daily
              guide · {m.daysLeft} budget day{m.daysLeft === 1 ? '' : 's'} left.
            </p>
          )}
        </motion.div>

        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="target" size={14} />
            Your wishlist
            <span
              className="mono"
              style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}
            >
              {items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · ${fmt(wishTotal)}` : ''}
            </span>
          </h3>
          {isLoading ? (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading...</p>
          ) : items.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Nothing parked yet. Add the things you&apos;re tempted to buy and PesaMali will tell you when your budget
              can take them.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {items.map((item) => {
                const v = judgePurchase(item.price, m, budget, goal)
                return (
                  <div
                    key={item.id}
                    style={{ display: 'grid', gap: 6, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b style={{ fontSize: 14 }}>{item.name}</b>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>
                        {fmt(item.price)}
                      </span>
                      <span style={{ marginLeft: 'auto' }}>
                        <VerdictChip v={v} />
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>{v.detail}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {v.tone !== 'danger' && (
                        <button
                          className="btn"
                          style={{
                            fontSize: 12,
                            padding: '6px 12px',
                            width: 'auto',
                            minHeight: 0,
                            border: '1px solid var(--line)',
                          }}
                          onClick={() => setBuyItem(item)}
                        >
                          <I n="check" size={13} />
                          Bought it — log expense
                        </button>
                      )}
                      <button
                        className="btn"
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          width: 'auto',
                          minHeight: 0,
                          border: '1px solid var(--line)',
                          color: 'var(--muted)',
                        }}
                        onClick={() => setRemoveItem(item)}
                      >
                        <I n="trash" size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
          >
            <I n="check" size={15} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!buyItem}
        title="Log this purchase?"
        message={
          buyItem
            ? `"${buyItem.name}" (${fmt(buyItem.price)}) will be logged as a Shopping expense today and removed from your wishlist.`
            : ''
        }
        confirmLabel="Yes, log it"
        onConfirm={() => {
          if (buyItem) buyAndLog(buyItem)
          setBuyItem(null)
        }}
        onCancel={() => setBuyItem(null)}
      />

      <ConfirmModal
        isOpen={!!removeItem}
        title="Remove from wishlist?"
        message={removeItem ? `"${removeItem.name}" (${fmt(removeItem.price)}) will be removed.` : ''}
        onConfirm={() => {
          if (removeItem) deleteItem(removeItem)
          setRemoveItem(null)
        }}
        onCancel={() => setRemoveItem(null)}
      />
    </motion.div>
  )
}
