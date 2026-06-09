'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { AISkeleton } from '@/components/AISkeleton'

interface Message {
  who: 'user' | 'ai'
  text: string
}

function render(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((s, i) =>
    s.startsWith('**') ? <b key={i}>{s.slice(2, -2)}</b> : s
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--primary)', display: 'block',
          }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function AIPage() {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => {
        if (d.name) {
          setMsgs([{
            who: 'ai',
            text: `Habari ${d.name}. I'm **Akiba AI**, your money coach. I read your live spending data directly from the database, so my answers are specific to your money — not generic advice. Ask how your week went, where you're overspending, or use a quick question on the right.`,
          }])
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [msgs, busy])

  const ask = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMsgs((ms) => [...ms, { who: 'user', text: question }])
    setBusy(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMsgs((ms) => [...ms, { who: 'ai', text: data.text || 'Sorry, I could not respond right now.' }])
    } catch {
      setMsgs((ms) => [...ms, { who: 'ai', text: 'Network error — please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  const chips: [string, string][] = [
    ['barChart', 'How was my week? Give me a full weekly report.'],
    ['scissors', 'Where am I overspending and what should I stop?'],
    ['target', 'Am I on track to finish the month with money left?'],
    ['bulb', 'Give me 3 practical tips to save more next week.'],
    ['search', 'What is my most expensive habit?'],
  ]

  if (isLoading) return <AISkeleton />

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Akiba AI</h1>
          <p>Your personal money coach — reads your live spending data from the database</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 99, padding: '6px 14px', boxShadow: 'var(--shadow)' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://curlgvbgasphosyhfncx.supabase.co/storage/v1/object/public/images/images/logos/Google_Gemini_icon_2025.svg.png"
            alt="Google Gemini"
            style={{ width: 18, height: 18, objectFit: 'contain' }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>Gemini</span>
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

            {busy && (
              <motion.div
                className="msg ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: '14px 18px' }}
              >
                <TypingDots />
              </motion.div>
            )}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending…"
              onKeyDown={(e) => e.key === 'Enter' && !busy && ask()}
              disabled={busy}
            />
            <motion.button
              className="send-btn"
              whileTap={{ scale: 0.92 }}
              onClick={() => ask()}
              disabled={busy}
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
                disabled={busy}
              >
                <I n={ic} />
                {q}
              </motion.button>
            ))}
          </div>
          <div className="card">
            <h3><I n="bot" size={14} />How it works</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.75 }}>
              Every question is answered using your live spending data pulled directly from the
              database — categories, daily totals, repeat items and pace — so the advice is about{' '}
              <b style={{ color: 'var(--text)' }}>your</b> actual money.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
