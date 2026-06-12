'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'
import { CATS, catOf, fmt, iso, MetricExpense } from '@/lib/metrics'
import { SuccessModal } from '@/components/SuccessModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { DatePicker } from '@/components/DatePicker'
import { LogSkeleton } from '@/components/LogSkeleton'
import { listContainer, listItem } from '@/lib/motion'

interface ExpenseDraft {
  item: string
  amount: number
  category: string
  date: string
}

function TxRow({
  e,
  onDelete,
  onSave,
}: {
  e: MetricExpense
  onDelete?: (id: string) => void
  onSave?: (id: string, draft: ExpenseDraft) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(e.item)
  const [draftAmt, setDraftAmt] = useState(e.amt.toString())
  const [draftCat, setDraftCat] = useState(e.cat)
  const [draftDate, setDraftDate] = useState(e.date)
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const c = catOf(e.cat)
  const dt = new Date(e.date + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  })

  useEffect(() => {
    if (!editing) {
      setDraft(e.item)
      setDraftAmt(e.amt.toString())
      setDraftCat(e.cat)
      setDraftDate(e.date)
    }
  }, [e.item, e.amt, e.cat, e.date, editing])

  const cancel = () => {
    setEditing(false)
  }

  const startEdit = () => {
    setMenuOpen(false)
    setEditing(true)
  }

  const save = async () => {
    if (!onSave) return cancel()
    const nextItem = draft.trim()
    const nextAmt = parseFloat(draftAmt)
    if (!nextItem || !nextAmt || nextAmt <= 0) return
    if (nextItem === e.item && nextAmt === e.amt && draftCat === e.cat && draftDate === e.date) {
      return cancel()
    }
    setSaving(true)
    const ok = await onSave(e.id, { item: nextItem, amount: nextAmt, category: draftCat, date: draftDate })
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="tx">
        <div className="l">
          <div className="cat-ic" style={{ color: c.color }}>
            <I n={c.icon} size={17} />
          </div>
          <div>
            {editing ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <input
                  className="tx-edit-input"
                  value={draft}
                  autoFocus
                  disabled={saving}
                  placeholder="Name"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') save()
                    if (event.key === 'Escape') cancel()
                  }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input
                    className="tx-edit-input"
                    style={{ width: 90 }}
                    type="number"
                    min="1"
                    value={draftAmt}
                    disabled={saving}
                    placeholder="Amount"
                    onChange={(event) => setDraftAmt(event.target.value)}
                  />
                  <select
                    className="tx-edit-input"
                    value={draftCat}
                    disabled={saving}
                    onChange={(event) => setDraftCat(event.target.value)}
                  >
                    {CATS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="tx-edit-input"
                    type="date"
                    value={draftDate}
                    disabled={saving}
                    onChange={(event) => setDraftDate(event.target.value)}
                  />
                </div>
              </div>
            ) : (
              <b>{e.item}</b>
            )}
            {!editing && (
              <span>
                {c.name} · {dt}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="amt">− {fmt(e.amt)}</span>
          {onSave && (
            editing ? (
              <>
                <button
                  className="tx-action"
                  onClick={save}
                  disabled={saving}
                  aria-label="Save expense name"
                  title="Save"
                >
                  <I n="check" size={14} />
                </button>
                <button
                  className="tx-action"
                  onClick={cancel}
                  disabled={saving}
                  aria-label="Cancel editing"
                  title="Cancel"
                >
                  <I n="x" size={14} />
                </button>
              </>
            ) : (
              <div className="tx-menu-wrap">
                <button
                  className="tx-action"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label={`Actions for ${e.item}`}
                  aria-expanded={menuOpen}
                  title="Actions"
                >
                  <I n="moreVertical" size={16} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      className="tx-menu"
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                    >
                      <button onClick={startEdit}>
                        <I n="edit" size={14} />
                        Edit
                      </button>
                      {onDelete && (
                        <button
                          className="danger"
                          onClick={() => {
                            setMenuOpen(false)
                            onDelete(e.id)
                          }}
                        >
                          <I n="trash" size={14} />
                          Delete
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          )}
          {onDelete && !onSave && (
            <button
              className="tx-action"
              onClick={() => onDelete(e.id)}
              aria-label={`Delete ${e.item}`}
              title="Delete"
            >
              <I n="x" size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function LogPage() {
  const [cat, setCat] = useState('food')
  const [item, setItem] = useState('')
  const [amt, setAmt] = useState('')
  const [date, setDate] = useState(iso(new Date()))
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [modalVariant, setModalVariant] = useState<'success' | 'warning'>('success')
  const [confirmDelete, setConfirmDelete] = useState<MetricExpense | null>(null)
  const [undoExpense, setUndoExpense] = useState<MetricExpense | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [dupBill, setDupBill] = useState<{ date: string; item: string; amount: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  const ping = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
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
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const add = async (force?: boolean) => {
    if (isAdding) return
    const a = parseFloat(amt)
    if (!item.trim()) return ping('Add a name for the expense')
    if (!a || a <= 0) return ping('Enter a valid amount')
    setIsAdding(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category: cat, item: item.trim(), amount: a, force: force === true }),
      })
      const data = await res.json()
      if (res.status === 409 && data.duplicateBill) {
        setDupBill(data.existing)
      } else if (res.ok) {
        setExpenses((ex) => [
          ...ex,
          { id: data.id, date: data.date, cat: data.category, item: data.item, amt: data.amount },
        ])
        setItem('')
        setAmt('')
        const env = data.envelope as { limit: number; spent: number; remaining: number } | null
        const cName = catOf(cat).name
        if (env && env.remaining < 0) {
          setSuccessMessage(
            `The money you allocated for ${cName} is finished. You are now ${fmt(-env.remaining)} over your ${fmt(env.limit)} budget.`
          )
          setModalVariant('warning')
        } else if (env) {
          setSuccessMessage(
            `Expense logged. ${fmt(env.remaining)} left of the ${fmt(env.limit)} you allocated for ${cName}.`
          )
          setModalVariant('success')
        } else {
          setSuccessMessage('Expense logged successfully. Your balances have been updated.')
          setModalVariant('success')
        }
        setShowSuccessModal(true)
      } else {
        ping(data.error || 'Failed to save expense')
      }
    } catch {
      ping('Failed to save expense')
    } finally {
      setIsAdding(false)
    }
  }

  const deleteExpense = async (expense: MetricExpense) => {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      if (res.ok) {
        setExpenses((ex) => ex.filter((e) => e.id !== expense.id))
        setUndoExpense(expense)
        if (undoTimer) clearTimeout(undoTimer)
        setUndoTimer(setTimeout(() => setUndoExpense(null), 6000))
      } else {
        ping('Failed to delete')
      }
    } catch {
      ping('Failed to delete')
    }
  }

  const undoDelete = async () => {
    if (!undoExpense) return
    const exp = undoExpense
    setUndoExpense(null)
    if (undoTimer) clearTimeout(undoTimer)
    try {
      // force: true skips the duplicate-bill check when restoring a fixed bill
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: exp.date, category: exp.cat, item: exp.item, amount: exp.amt, force: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setExpenses((ex) => [
          ...ex,
          { id: data.id, date: data.date, cat: data.category, item: data.item, amt: data.amount, fixed: data.fixed },
        ])
        ping('Expense restored')
      } else {
        ping(data.error || 'Failed to restore expense')
      }
    } catch {
      ping('Failed to restore expense')
    }
  }

  const saveExpense = async (id: string, draft: ExpenseDraft) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (res.ok) {
        setExpenses((ex) =>
          ex.map((e) =>
            e.id === id ? { ...e, item: data.item, amt: data.amount, cat: data.category, date: data.date } : e
          )
        )
        setSuccessMessage('Expense updated successfully.')
        setModalVariant('success')
        setShowSuccessModal(true)
        return true
      }
      ping(data.error || 'Failed to update expense')
    } catch {
      ping('Failed to update expense')
    }
    return false
  }

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  if (isLoading) return <LogSkeleton />

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show">
      <PageHeroCard
        icon="plusCircle"
        badge="New expense"
        title="Log an expense"
        subtitle="Every shilling counted. Balances update instantly."
      />
      <motion.div className="log-grid" variants={listContainer}>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="plusCircle" size={14} />
            New expense
          </h3>
          <div className="cat-pick">
            {CATS.filter((c) => c.id !== 'rent' && c.id !== 'internet').map((c) => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.94 }}
                className={'cat-btn' + (cat === c.id ? ' sel' : '')}
                onClick={() => setCat(c.id)}
              >
                <I n={c.icon} size={17} />
                {c.name}
              </motion.button>
            ))}
          </div>
          <div className="field">
            <label>Expense name</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Fare, KPLC prepaid, lunch"
            />
          </div>
          <div className="field">
            <label>Amount (KES)</label>
            <input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              type="number"
              min="1"
              placeholder="e.g. 50"
              onKeyDown={(e) => e.key === 'Enter' && !isAdding && add()}
            />
          </div>
          <div className="field">
            <label>Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <motion.button className="btn btn-primary" whileTap={{ scale: 0.97 }} onClick={() => add()} disabled={isAdding}>
            <I n="plusCircle" size={16} />
            {isAdding ? 'Adding...' : 'Add expense'}
          </motion.button>
        </motion.div>
        <motion.div className="card" variants={listItem}>
          <h3>
            <I n="receipt" size={14} />
            All expenses this month
            <span
              className="mono"
              style={{
                marginLeft: 'auto',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--muted)',
              }}
            >
              {sorted.length} logged
            </span>
          </h3>
          <div className="scroll">
            <AnimatePresence initial={false}>
              {sorted.map((e) => (
                <TxRow
                  key={e.id}
                  e={e}
                  onSave={saveExpense}
                  onDelete={() => setConfirmDelete(e)}
                />
              ))}
            </AnimatePresence>
            {!sorted.length && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '18px 0' }}>
                No expenses yet. Log your first one to get started.
              </p>
            )}
          </div>
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

      <SuccessModal
        isOpen={showSuccessModal}
        title={modalVariant === 'warning' ? 'Budget depleted!' : 'Success!'}
        message={successMessage}
        variant={modalVariant}
        onClose={() => setShowSuccessModal(false)}
      />

      <ConfirmModal
        isOpen={!!dupBill}
        title="Already logged this month?"
        message={
          dupBill
            ? `"${dupBill.item}" (${fmt(dupBill.amount)}) was already logged on ${dupBill.date}, possibly automatically from your recurring expenses. Logging this would count the bill twice.`
            : ''
        }
        confirmLabel="Log anyway"
        onConfirm={() => {
          setDupBill(null)
          add(true)
        }}
        onCancel={() => setDupBill(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Remove this expense?"
        message={
          confirmDelete
            ? `"${confirmDelete.item}" (${fmt(confirmDelete.amt)}) will be removed and your balances updated.`
            : ''
        }
        onConfirm={() => {
          if (confirmDelete) deleteExpense(confirmDelete)
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <AnimatePresence>
        {undoExpense && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
          >
            <I n="trash" size={15} />
            Expense deleted
            <button
              onClick={undoDelete}
              style={{
                marginLeft: 10,
                border: 'none',
                background: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
