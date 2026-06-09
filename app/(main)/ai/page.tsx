'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { useMetrics, MetricExpense } from '@/lib/metrics'

interface Message {
  who: 'user' | 'ai'
  text: string
}

function render(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((s, i) =>
    s.startsWith('**') ? <b key={i}>{s.slice(2, -2)}</b> : s
  )
}

export default function AIPage() {
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [userName, setUserName] = useState('')
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => {
        if (d.name) {
          setUserName(d.name)
          setMsgs([{
            who: 'ai',
            text: `Habari ${d.name}. I'm **Akiba AI**, your money coach. I read your live spending data for this month, so my answers are about your money, not generic advice. Ask how your week went, where you're overspending, or what to change — or use a quick question on the right.`,
          }])
        }
        if (d.monthlyBudget) setBudget(d.monthlyBudget)
        if (d.savingsGoal) setGoal(d.savingsGoal)
      })
      .catch(() => {})
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
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [msgs, busy])

  const m = useMetrics(expenses, budget, goal)

  const ask = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMsgs((ms) => [...ms, { who: 'user', text: question }])
    setBusy(true)

    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const ctx = {
      user: userName, currency: 'KES', budget, goal,
      spent: m.spent, remaining: m.remaining,
      dayOfMonth: now.getDate(), daysInMonth, daysLeft: m.daysLeft,
      spendPacePct: Math.round(m.spendPace * 100),
      monthPacePct: Math.round(m.monthPace * 100),
      status: m.status, safeToSpendToday: Math.round(m.safe),
      projectedMonthEndSpend: Math.round(m.projected),
      byCategory: m.byCat.map((c) => ({ name: c.name, amt: c.amt })),
      last7Days: m.last7.map((o) => ({ day: o.label, amt: o.amt })),
      topRepeatItems: m.topItems.slice(0, 3).map((t) => `${t.name} (${t.n}x, KES ${t.amt})`),
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: ctx }),
      })
      const data = await res.json()
      setBusy(false)
      setMsgs((ms) => [...ms, { who: 'ai', text: data.text || 'Sorry, I could not respond.' }])
    } catch {
      setBusy(false)
      setMsgs((ms) => [...ms, { who: 'ai', text: 'Sorry, I could not connect. Please try again.' }])
    }
  }

  const chips: [string, string][] = [
    ['barChart', 'How was my week? Give me a full weekly report.'],
    ['scissors', 'Where am I overspending and what should I stop?'],
    ['target', 'Am I on track to finish the month with money left?'],
    ['bulb', 'Give me 3 practical tips to save more next week.'],
    ['search', 'What is my most expensive habit?'],
  ]

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Akiba AI</h1>
          <p>Your personal money coach — it reads your real spending data</p>
        </div>
      </div>
      <div className="chat-shell">
        <div className="chat-card">
          <div className="chat-log" ref={logRef}>
            <AnimatePresence initial={false}>
              {msgs.map((mm, i) => (
                <motion.div
                  key={i}
                  className={'msg ' + mm.who}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {render(mm.text)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {busy && (
            <div className="typing">
              <I n="sparkles" size={13} />
              Akiba AI is thinking…
            </div>
          )}
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending…"
              onKeyDown={(e) => e.key === 'Enter' && ask()}
            />
            <motion.button
              className="send-btn"
              whileTap={{ scale: 0.92 }}
              onClick={() => ask()}
              aria-label="Send"
            >
              <I n="send" size={16} />
            </motion.button>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3><I n="zap" size={14} />Quick questions</h3>
            {chips.map(([ic, q]) => (
              <motion.button
                key={q}
                className="prompt-chip"
                whileTap={{ scale: 0.97 }}
                onClick={() => ask(q)}
              >
                <I n={ic} />
                {q}
              </motion.button>
            ))}
          </div>
          <div className="card">
            <h3><I n="bot" size={14} />How it works</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>
              Every question is sent with a live summary of your budget, pace, categories and daily
              totals — so the advice is about{' '}
              <b style={{ color: 'var(--text)' }}>your</b> money, not generic tips.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
