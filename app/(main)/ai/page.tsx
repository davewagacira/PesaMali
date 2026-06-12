'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AISkeleton } from '@/components/AISkeleton'
import { I } from '@/components/Icons'
import { SuccessModal } from '@/components/SuccessModal'
import { PageHeroCard } from '@/components/PageHeroCard'
import { compressMessages, getCompressedContext } from '@/lib/messageCompression'
import { MetricExpense, fmt, fmtN, useMetrics } from '@/lib/metrics'

interface Message {
  who: 'user' | 'ai'
  text: string
}

interface CompressedSection {
  isCompressed: true
  summary: string
  messageCount: number
  expanded: boolean
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

type DisplayMessage = (Message & { isCompressed?: false }) | CompressedSection

const statusMeta = {
  ok: { label: 'On track', icon: 'check', tone: 'ok' },
  warn: { label: 'Slow down', icon: 'alert', tone: 'warn' },
  danger: { label: 'Danger zone', icon: 'flame', tone: 'danger' },
} as const

const suggestions: [string, string, string][] = [
  ['barChart', 'How was my week?', 'How was my week? Give me a full weekly report.'],
  ['scissors', 'Where should I cut back?', 'Where am I overspending and what should I stop?'],
  ['target', 'Am I on track?', 'Am I on track to finish the month with money left?'],
  ['bulb', 'Tips to save more', 'Give me 3 practical tips to save more next week.'],
  ['search', 'Most expensive habit', 'What is my most expensive habit?'],
]

const PINNED_CONVERSATIONS_KEY = 'pesamali:pinned-ai-conversations'
const SPACED_PINNED_CONVERSATIONS_KEY = 'pesa-mali:pinned-ai-conversations'
const PREVIOUS_PINNED_CONVERSATIONS_KEY = ['pes', 'arly:pinned-ai-conversations'].join('')
const LEGACY_PINNED_CONVERSATIONS_KEY = ['aki', 'ba:pinned-ai-conversations'].join('')

function render(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((s, i) =>
    s.startsWith('**') ? <b key={i}>{s.slice(2, -2)}</b> : s
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 px-0.5 py-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-[7px] w-[7px] rounded-full bg-[var(--primary)]"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function Orb({ thinking = false, small = false }: { thinking?: boolean; small?: boolean }) {
  if (small) {
    return (
      <div className="relative h-[30px] w-[30px] shrink-0 rounded-full bg-[conic-gradient(from_0deg,#4F46E5,#7C3AED,#06B6D4,#4F46E5)] animate-spin">
        <div className="absolute inset-[7px] rounded-full bg-[var(--card)]" />
      </div>
    )
  }

  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <div className="absolute -inset-[9px] rounded-full border border-dashed border-[var(--line)] [animation:spin_24s_linear_infinite_reverse]" />
      <div
        className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#4F46E5,#7C3AED,#06B6D4,#4F46E5)] saturate-125 animate-spin"
        style={{ animationDuration: thinking ? '1.1s' : '6s' }}
      >
        <div className="absolute inset-[5px] rounded-full bg-[var(--bg)]" />
      </div>
      <motion.div
        className="absolute inset-[18px] grid place-items-center rounded-full [background:var(--primary-grad)] text-white shadow-[var(--shadow-lg)]"
        animate={{ scale: thinking ? [1, 1.08, 1] : [1, 1.06, 1] }}
        transition={{ duration: thinking ? 0.9 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <I n="sparkles" size={24} />
      </motion.div>
    </div>
  )
}

function InsightCard({
  icon,
  tone,
  label,
  value,
  delay,
}: {
  icon: string
  tone: 'p' | 'ok' | 'warn' | 'danger'
  label: string
  value: string
  delay: number
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-[var(--green-soft)] text-[var(--green)]'
      : tone === 'warn'
        ? 'bg-[var(--amber-soft)] text-[var(--amber)]'
        : tone === 'danger'
          ? 'bg-[var(--red-soft)] text-[var(--red)]'
          : 'bg-[var(--primary-soft)] text-[var(--primary)]'

  return (
    <motion.div
      className="flex items-center gap-[13px] rounded-2xl border border-[var(--line)] bg-[var(--card)] px-[18px] py-4 shadow-[var(--shadow)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <I n={icon} size={18} />
      </div>
      <div className="min-w-0">
        <small className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[1px] text-[var(--muted)]">
          {label}
        </small>
        <b className="mono block truncate text-base font-semibold">{value}</b>
      </div>
    </motion.div>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  return (
    <motion.div
      className={`flex max-w-[86%] gap-[11px] ${msg.who === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-xs font-semibold ${
          msg.who === 'ai'
            ? '[background:var(--primary-grad)] text-white'
            : 'border border-[var(--line)] bg-[var(--card-2)] text-[var(--muted)]'
        }`}
      >
        {msg.who === 'ai' ? <I n="sparkles" size={15} /> : 'D'}
      </div>
      <div
        className={`whitespace-pre-wrap rounded-2xl px-[17px] py-[13px] text-[13.5px] leading-[1.75] ${
          msg.who === 'ai'
            ? 'rounded-tl-[5px] border border-[var(--line)] bg-[var(--card-2)] [&_b]:font-semibold [&_b]:text-[var(--primary)]'
            : 'rounded-tr-[5px] [background:var(--primary-grad)] text-white [&_b]:font-semibold [&_b]:text-white'
        }`}
      >
        {render(msg.text)}
      </div>
    </motion.div>
  )
}

export default function AIPage() {
  const [msgs, setMsgs] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streamingReply, setStreamingReply] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [expenses, setExpenses] = useState<MetricExpense[]>([])
  const [budget, setBudget] = useState(15000)
  const [goal, setGoal] = useState(2000)
  const [userName, setUserName] = useState('there')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null)
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>([])
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [expandedCompressed, setExpandedCompressed] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const initializedWelcome = useRef(false)

  const metrics = useMetrics(expenses, budget, goal)
  const now = useMemo(() => new Date(), [])
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const status = statusMeta[metrics.status]
  const topCategory = metrics.byFlexCat[0]
  const secondCategory = metrics.byFlexCat[1]
  const topItem = metrics.topItems[0]
  const weekTotal = metrics.last7.reduce((s, d) => s + d.amt, 0)
  const weekMax = Math.max(...metrics.last7.map((d) => d.amt), 1)
  const heavyDay = [...metrics.last7].sort((a, b) => b.amt - a.amt)[0]
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aPinned = pinnedConversationIds.includes(a.id)
      const bPinned = pinnedConversationIds.includes(b.id)
      if (aPinned !== bPinned) return aPinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [conversations, pinnedConversationIds])

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then((r) => r.json()),
      fetch('/api/profiles/current').then((r) => r.json()),
      fetch('/api/expenses').then((r) => r.json()),
      fetch('/api/ai/conversations').then((r) => r.json()),
    ])
      .then(([userData, profileData, expenseData, convData]) => {
        if (userData.name) setUserName(userData.name)
        if (profileData.monthlyBudget !== undefined) setBudget(profileData.monthlyBudget)
        if (profileData.savingsGoal !== undefined) setGoal(profileData.savingsGoal)
        setMemoryEnabled(userData.aiMemoryEnabled !== false)
        if (Array.isArray(expenseData)) {
          setExpenses(
            expenseData.map((e: { id: string; date: string; category: string; item: string; amount: number; fixed?: boolean | null }) => ({
              id: e.id,
              date: e.date,
              cat: e.category,
              item: e.item,
              amt: e.amount, fixed: e.fixed,
            }))
          )
        }
        if (Array.isArray(convData)) setConversations(convData)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem(PINNED_CONVERSATIONS_KEY)
    const spacedSaved = window.localStorage.getItem(SPACED_PINNED_CONVERSATIONS_KEY)
    const previousSaved = window.localStorage.getItem(PREVIOUS_PINNED_CONVERSATIONS_KEY)
    const legacySaved = window.localStorage.getItem(LEGACY_PINNED_CONVERSATIONS_KEY)
    const stored = saved ?? spacedSaved ?? previousSaved ?? legacySaved
    if (saved === null && stored !== null) {
      window.localStorage.setItem(PINNED_CONVERSATIONS_KEY, stored)
    }
    if (spacedSaved !== null) {
      window.localStorage.removeItem(SPACED_PINNED_CONVERSATIONS_KEY)
    }
    if (previousSaved !== null) {
      window.localStorage.removeItem(PREVIOUS_PINNED_CONVERSATIONS_KEY)
    }
    if (legacySaved !== null) {
      window.localStorage.removeItem(LEGACY_PINNED_CONVERSATIONS_KEY)
    }
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) setPinnedConversationIds(parsed.filter((id) => typeof id === 'string'))
    } catch {}
  }, [])

  useEffect(() => {
    if (!openConversationMenuId) return

    const closeMenu = () => setOpenConversationMenuId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [openConversationMenuId])

  useEffect(() => {
    if (isLoading || initializedWelcome.current) return
    initializedWelcome.current = true
    const category = topCategory?.name || 'your flexible spending'
    setMsgs([
      {
        who: 'ai',
        text: `Habari ${userName}. I'm **PesaMali AI** - and I've read your month: **${fmt(metrics.spent)}** spent, **${fmt(metrics.remaining)}** remaining, biggest category **${category}**. Ask me anything, or tap a suggestion below.`,
      },
    ])
  }, [isLoading, metrics.remaining, metrics.spent, topCategory?.name, userName])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [msgs, busy, expandedCompressed])

  const displayedMessages: DisplayMessage[] = useMemo(() => {
    if (expandedCompressed || msgs.length <= 9) {
      return msgs.map((m) => ({ ...m, isCompressed: false }))
    }
    return compressMessages(msgs, 6) as DisplayMessage[]
  }, [expandedCompressed, msgs])

  const startNewChat = () => {
    setCurrentConversationId(null)
    setExpandedCompressed(false)
    setMsgs([
      {
        who: 'ai',
        text: `Habari ${userName}. I'm **PesaMali AI** - and I've read your month: **${fmt(metrics.spent)}** spent, **${fmt(metrics.remaining)}** remaining. Ask how your week went, where you're overspending, or what to do next.`,
      },
    ])
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = 0
    })
  }

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`)
      const data = await res.json()
      setCurrentConversationId(convId)
      setExpandedCompressed(false)
      setMsgs(data.messages.map((m: { role: 'user' | 'ai'; content: string }) => ({ who: m.role, text: m.content })))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/ai/conversations/${convId}`, { method: 'DELETE' })
      setConversations((cs) => cs.filter((c) => c.id !== convId))
      setPinnedConversationIds((ids) => {
        const next = ids.filter((id) => id !== convId)
        window.localStorage.setItem(PINNED_CONVERSATIONS_KEY, JSON.stringify(next))
        return next
      })
      if (currentConversationId === convId) startNewChat()
      setSuccessMessage('Conversation deleted.')
      setShowSuccessModal(true)
    } catch (e) {
      console.error(e)
    }
    setShowDeleteConfirm(null)
    setOpenConversationMenuId(null)
  }

  const togglePinnedConversation = (convId: string) => {
    setPinnedConversationIds((ids) => {
      const next = ids.includes(convId) ? ids.filter((id) => id !== convId) : [convId, ...ids]
      window.localStorage.setItem(PINNED_CONVERSATIONS_KEY, JSON.stringify(next))
      return next
    })
    setOpenConversationMenuId(null)
  }

  const openRenameConversation = (conversation: Conversation) => {
    setRenameConversationId(conversation.id)
    setRenameTitle(conversation.title)
    setOpenConversationMenuId(null)
  }

  const renameConversation = async () => {
    if (!renameConversationId || !renameTitle.trim()) return

    try {
      const res = await fetch(`/api/ai/conversations/${renameConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle.trim() }),
      })
      if (!res.ok) throw new Error('rename failed')
      const data = await res.json()
      setConversations((cs) =>
        cs.map((c) => (c.id === renameConversationId ? { ...c, title: data.title || renameTitle.trim() } : c))
      )
      setSuccessMessage('Conversation renamed.')
      setShowSuccessModal(true)
      setRenameConversationId(null)
      setRenameTitle('')
    } catch (e) {
      console.error(e)
    }
  }

  const toggleMemory = async () => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiMemoryEnabled: !memoryEnabled }),
      })
      setMemoryEnabled(!memoryEnabled)
      setSuccessMessage(memoryEnabled ? "Memory disabled. Conversations won't be saved." : 'Memory enabled. Conversations will be saved.')
      setShowSuccessModal(true)
    } catch (e) {
      console.error(e)
    }
  }

  const ask = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setStreamingReply('')
    const nextMsgs: Message[] = [...msgs, { who: 'user', text: question }]
    setMsgs(nextMsgs)
    setBusy(true)

    try {
      const compressedContext = getCompressedContext(msgs, 6)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationId: currentConversationId, compressedContext }),
      })
      const data = await res.json()
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId)
        const convRes = await fetch('/api/ai/conversations')
        const convData = await convRes.json()
        if (Array.isArray(convData)) setConversations(convData)
      }
      await streamAiReply(data.text || 'Sorry, I could not respond right now.')
    } catch {
      await streamAiReply('Network error - please try again.')
    } finally {
      setBusy(false)
      setStreamingReply('')
    }
  }

  const streamAiReply = (text: string) => {
    return new Promise<void>((resolve) => {
      const parts = text.split(/(\s+)/)
      let index = 0
      let visible = ''
      setStreamingReply('')

      const tick = () => {
        if (index >= parts.length) {
          setMsgs((ms) => [...ms, { who: 'ai', text }])
          resolve()
          return
        }

        const part = parts[index]
        visible += part
        index += 1
        setStreamingReply(visible)

        const delay = part.trim() ? 12 + Math.random() * 26 : 0
        window.setTimeout(tick, delay)
      }

      tick()
    })
  }

  const autoInsights = [
    {
      icon: 'trendUp',
      tone: 'bg-[var(--primary-soft)] text-[var(--primary)]',
      text: topCategory
        ? `${topCategory.name} is your biggest flexible category - ${fmt(topCategory.amt)} (${Math.round((topCategory.amt / Math.max(metrics.flexibleSpent, 1)) * 100)}% of flexible spending).`
        : 'Start logging expenses and PesaMali AI will identify your biggest spending category.',
      ask: 'Where am I overspending and what should I stop?',
    },
    {
      icon: 'flame',
      tone: 'bg-[var(--amber-soft)] text-[var(--amber)]',
      text: `${heavyDay?.label || 'Today'} was your heaviest day this week at ${fmt(heavyDay?.amt || 0)}.`,
      ask: 'Why do I spend more on some days, and how do I fix it?',
    },
    {
      icon: 'check',
      tone: 'bg-[var(--green-soft)] text-[var(--green)]',
      text: `At this pace you'd end the month having spent ${fmt(metrics.projected)} of your ${fmt(budget)} budget.`,
      ask: 'Am I on track to finish the month with money left?',
    },
  ]

  if (isLoading) return <AISkeleton />

  return (
    <div
      className="relative -m-2 overflow-hidden px-2 pb-10"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.i
          className="absolute -left-28 -top-44 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,#6366F1,transparent_65%)] opacity-50 blur-[90px] dark:opacity-30"
          animate={{ x: [0, 60], y: [0, 40], scale: [1, 1.12] }}
          transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
        <motion.i
          className="absolute -bottom-44 -right-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,#7C3AED,transparent_65%)] opacity-50 blur-[90px] dark:opacity-30"
          animate={{ x: [0, 60], y: [0, 40], scale: [1, 1.12] }}
          transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: -5 }}
        />
        <motion.i
          className="absolute right-[18%] top-[30%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,#06B6D4,transparent_65%)] opacity-30 blur-[90px]"
          animate={{ x: [0, 60], y: [0, 40], scale: [1, 1.12] }}
          transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: -9 }}
        />
      </div>

      <div className="mx-auto max-w-[1180px]">
        <PageHeroCard
          icon="sparkles"
          badge="AI insights"
          title="PesaMali AI"
          subtitle="Personal financial intelligence built from your real spending behavior."
        >
          <button
            onClick={toggleMemory}
            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-[15px] py-[9px] text-[12.5px] font-medium text-[var(--muted)] shadow-[var(--shadow)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <I n={memoryEnabled ? 'check' : 'lock'} size={14} />
            Memory {memoryEnabled ? 'on' : 'off'}
          </button>
        </PageHeroCard>

        <motion.div
          className="mb-[26px] flex items-center gap-[26px] max-[1180px]:flex-col max-[1180px]:items-start max-[1180px]:gap-[18px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <Orb thinking={busy} />
          <div>
            <h1 className="text-[30px] font-extrabold leading-[1.2] tracking-normal max-[1180px]:text-2xl">
              Your money,{' '}
              <span className="bg-gradient-to-r from-[var(--primary)] via-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                understood.
              </span>
            </h1>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-[1.7] text-[var(--muted)]">
              PesaMali AI reads your live spending data, every shilling, every category, every day, and
              answers like a coach who actually knows you. Ask anything about your month.
            </p>
          </div>
        </motion.div>

        <div className="mb-6 grid grid-cols-4 gap-3.5 max-[1180px]:grid-cols-2 max-[560px]:grid-cols-1">
          <InsightCard icon="target" tone="p" label="Safe to spend today" value={fmt(metrics.safe)} delay={0} />
          <InsightCard icon="wallet" tone="p" label="Remaining" value={fmt(metrics.remaining)} delay={0.07} />
          <InsightCard
            icon="trendUp"
            tone="p"
            label="Pace"
            value={`${Math.round(metrics.spendPace * 100)}% / ${Math.round(metrics.monthPace * 100)}%`}
            delay={0.14}
          />
          <InsightCard icon={status.icon} tone={status.tone} label="Status" value={status.label} delay={0.21} />
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-[18px] max-[1180px]:grid-cols-1">
          <motion.section
            className="flex h-[min(720px,calc(100dvh-280px))] min-h-[520px] flex-col overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] max-[1180px]:h-[min(560px,calc(100dvh-220px))] max-[1180px]:min-h-[420px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
          >
            <div className="flex shrink-0 items-center gap-[11px] border-b border-[var(--line)] px-5 py-4">
              <Orb small />
              <div>
                <b className="text-sm font-bold">PesaMali AI</b>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                  {busy ? 'Reading your spending data...' : currentConversationId ? 'Conversation with memory' : 'Connected to your live data'}
                </div>
              </div>
              <button
                onClick={startNewChat}
                className="ml-auto flex items-center gap-1.5 text-xs text-[var(--faint)] transition hover:text-[var(--red)]"
              >
                <I n="plusCircle" size={13} />
                New chat
              </button>
            </div>

            <div ref={logRef} className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[22px] scroll-smooth">
              <AnimatePresence initial={false} mode="popLayout">
                {displayedMessages.map((item, i) => {
                  if ('isCompressed' in item && item.isCompressed) {
                    return (
                      <motion.button
                        key="compressed-summary"
                        onClick={() => setExpandedCompressed(!expandedCompressed)}
                        className="my-1 rounded-xl border border-[var(--line)] bg-[var(--card-2)] px-4 py-3 text-left text-xs leading-6 text-[var(--muted)] transition hover:bg-[var(--primary-soft)]"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                      >
                        <span className="mb-1 flex items-center gap-2 font-semibold">
                          <I n="book" size={14} />
                          {item.messageCount} earlier messages compressed
                          <span className="ml-auto">{expandedCompressed ? 'Hide' : 'Show'}</span>
                        </span>
                        {item.summary}
                      </motion.button>
                    )
                  }
                  const msg = item as Message
                  return <MessageRow key={`${msg.who}-${i}-${msg.text.slice(0, 24)}`} msg={msg} />
                })}

                  {busy && !streamingReply && (
                    <motion.div
                      className="flex max-w-[86%] gap-[11px] self-start"
                      initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] [background:var(--primary-grad)] text-white">
                      <I n="sparkles" size={15} />
                    </div>
                    <div className="rounded-2xl rounded-tl-[5px] border border-[var(--line)] bg-[var(--card-2)] px-[17px] py-[13px]">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}

                {streamingReply && (
                  <motion.div
                    className="flex max-w-[86%] gap-[11px] self-start"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] [background:var(--primary-grad)] text-white">
                      <I n="sparkles" size={15} />
                    </div>
                    <div className="whitespace-pre-wrap rounded-2xl rounded-tl-[5px] border border-[var(--line)] bg-[var(--card-2)] px-[17px] py-[13px] text-[13.5px] leading-[1.75] [&_b]:font-semibold [&_b]:text-[var(--primary)]">
                      {render(streamingReply)}
                      <motion.span
                        className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-0.5 rounded-sm bg-[var(--primary)]"
                        animate={{ opacity: [1, 1, 0, 0] }}
                        transition={{ duration: 1, repeat: Infinity, times: [0, 0.48, 0.5, 1] }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-auto shrink-0 rounded-b-[20px] border-t border-[var(--line)] bg-[var(--card)] px-4 py-2.5">
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {suggestions.slice(0, 4).map(([icon, label, question]) => (
                  <button
                    key={question}
                    onClick={() => ask(question)}
                    disabled={busy}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card-2)] px-3 py-1.5 text-[10px] font-medium text-[var(--muted)] transition hover:-translate-y-px hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60"
                  >
                    <I n={icon} size={12} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--bg)] py-1 pl-3 pr-1 transition focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_var(--primary-soft)]">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !busy && ask()}
                  disabled={busy}
                  placeholder="Ask about your spending..."
                  className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  onClick={() => ask()}
                  disabled={busy}
                  aria-label="Send"
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] [background:var(--primary-grad)] text-white shadow-[var(--shadow-lg)] transition active:scale-95 disabled:opacity-60"
                >
                  <I n="send" size={16} />
                </button>
              </div>
            </div>
          </motion.section>

          <aside className="flex flex-col gap-3.5">
            {conversations.length > 0 && (
              <motion.div
                className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
              >
                <h3 className="mb-3.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--muted)]">
                  <I n="book" size={13} />
                  Recent chats
                </h3>
                <div className="flex flex-col gap-1.5">
                  {sortedConversations.slice(0, 6).map((conv) => {
                    const isPinned = pinnedConversationIds.includes(conv.id)
                    const isActive = currentConversationId === conv.id

                    return (
                      <div key={conv.id} className="relative">
                        <div
                          className={`flex items-center gap-1.5 rounded-xl transition ${
                            isActive
                              ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                              : 'bg-[var(--card-2)] text-[var(--muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setOpenConversationMenuId(null)
                              loadConversation(conv.id)
                            }}
                            className="min-w-0 flex-1 px-3 py-2 text-left text-xs font-semibold"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              {isPinned && <I n="flag" size={11} />}
                              <span className="truncate">{conv.title}</span>
                            </span>
                          </button>
                          <button
                            aria-label="Conversation actions"
                            aria-expanded={openConversationMenuId === conv.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenConversationMenuId(openConversationMenuId === conv.id ? null : conv.id)
                            }}
                            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--card)] hover:text-[var(--primary)]"
                          >
                            <I n="moreVertical" size={16} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {openConversationMenuId === conv.id && (
                            <motion.div
                              className="absolute right-1 top-9 z-20 w-36 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-[var(--shadow-lg)]"
                              onClick={(e) => e.stopPropagation()}
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.14 }}
                            >
                              <button
                                onClick={() => togglePinnedConversation(conv.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)] hover:text-[var(--text)]"
                              >
                                <I n="flag" size={13} />
                                {isPinned ? 'Unpin chat' : 'Pin chat'}
                              </button>
                              <button
                                onClick={() => openRenameConversation(conv)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)] hover:text-[var(--text)]"
                              >
                                <I n="receipt" size={13} />
                                Rename chat
                              </button>
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm(conv.id)
                                  setOpenConversationMenuId(null)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--red)] transition hover:bg-[var(--red-soft)]"
                              >
                                <I n="flame" size={13} />
                                Delete chat
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            <motion.div
              className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22, ease: 'easeOut' }}
            >
              <h3 className="mb-3.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--muted)]">
                <I n="barChart" size={13} />
                7-day pulse
              </h3>
              <div className="mb-2.5 flex h-[74px] items-end gap-[7px]">
                {metrics.last7.map((day, i) => (
                  <motion.div
                    key={`${day.label}-${i}`}
                    title={fmt(day.amt)}
                    className={`min-h-1 flex-1 rounded-t-md rounded-b-[3px] ${
                      day.today
                        ? 'bg-gradient-to-b from-[#06B6D4] to-[#0891B2]'
                        : 'bg-gradient-to-b from-[#6366F1] to-[#8B5CF6]'
                    }`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                    style={{ height: `${Math.max(5, (day.amt / weekMax) * 100)}%`, transformOrigin: 'bottom' }}
                  />
                ))}
              </div>
              <div className="flex gap-[7px]">
                {metrics.last7.map((day, i) => (
                  <span key={`${day.label}-${i}`} className="flex-1 text-center text-[10px] font-medium text-[var(--muted)]">
                    {day.label}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-xs leading-[1.7] text-[var(--muted)]">
                <b className="mono font-semibold text-[var(--text)]">{fmt(weekTotal)}</b> in the last 7 days, about{' '}
                <b className="mono font-semibold text-[var(--text)]">{fmt(weekTotal / 7)}</b> per day.
              </p>
            </motion.div>

            <motion.div
              className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.27, ease: 'easeOut' }}
            >
              <h3 className="mb-3.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--muted)]">
                <I n="bulb" size={13} />
                Auto insights
              </h3>
              {autoInsights.map((insight) => (
                <div key={insight.ask} className="flex items-start gap-[11px] border-b border-[var(--line)] py-[11px] first:pt-0 last:border-0 last:pb-0">
                  <div className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] ${insight.tone}`}>
                    <I n={insight.icon} size={14} />
                  </div>
                  <div>
                    <p className="text-xs leading-[1.6] text-[var(--muted)]">{insight.text}</p>
                    <button
                      onClick={() => ask(insight.ask)}
                      disabled={busy}
                      className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--primary)] disabled:opacity-60"
                    >
                      Ask about this
                      <I n="trendUp" size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.37, ease: 'easeOut' }}
            >
              <h3 className="mb-3.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--muted)]">
                <I n="bot" size={13} />
                How it works
              </h3>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--green-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Live context attached
              </div>
              <p className="text-xs leading-[1.7] text-[var(--muted)]">
                Every question is sent with a real-time summary of your budget, pace, categories
                and daily totals, so advice is about <b className="font-semibold text-[var(--text)]">your</b>{' '}
                money, never generic tips.
              </p>
              {topCategory && (
                <p className="mt-2.5 text-xs leading-[1.7] text-[var(--muted)]">
                  Biggest focus: <b className="font-semibold text-[var(--text)]">{topCategory.name}</b>
                  {secondCategory ? `, followed by ${secondCategory.name}` : ''}.{' '}
                  {topItem ? `Most repeated item: ${topItem.name}.` : ''}
                </p>
              )}
            </motion.div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-[99] grid place-items-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-lg font-bold">Delete conversation?</h2>
              <p className="mb-5 text-sm text-[var(--muted)]">This action cannot be undone.</p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 rounded-[11px] border border-[var(--line)] bg-[var(--card-2)] p-3 font-semibold text-[var(--muted)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteConversation(showDeleteConfirm)}
                  className="flex-1 rounded-[11px] bg-[var(--red)] p-3 font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameConversationId && (
          <div
            className="fixed inset-0 z-[99] grid place-items-center bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setRenameConversationId(null)
              setRenameTitle('')
            }}
          >
            <motion.div
              className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow-lg)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-lg font-bold">Rename chat</h2>
              <p className="mb-5 text-sm text-[var(--muted)]">Give this conversation a clearer name.</p>
              <input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && renameConversation()}
                autoFocus
                className="mb-5 w-full rounded-[11px] border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-soft)]"
              />
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    setRenameConversationId(null)
                    setRenameTitle('')
                  }}
                  className="flex-1 rounded-[11px] border border-[var(--line)] bg-[var(--card-2)] p-3 font-semibold text-[var(--muted)]"
                >
                  Cancel
                </button>
                <button
                  onClick={renameConversation}
                  disabled={!renameTitle.trim()}
                  className="flex-1 rounded-[11px] [background:var(--primary-grad)] p-3 font-semibold text-white disabled:opacity-50"
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SuccessModal
        isOpen={showSuccessModal}
        title="Success!"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  )
}
