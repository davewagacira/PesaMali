'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { AISkeleton } from '@/components/AISkeleton'
import { SuccessModal } from '@/components/SuccessModal'
import { compressMessages, getCompressedContext } from '@/lib/messageCompression'

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
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'block',
            boxShadow: '0 0 0 0 var(--primary)',
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.4, 1, 0.4],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
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
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedCompressed, setExpandedCompressed] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Load conversations and user settings
  useEffect(() => {
    Promise.all([
      fetch('/api/user').then((r) => r.json()),
      fetch('/api/ai/conversations').then((r) => r.json()),
    ])
      .then(([userData, convData]) => {
        setMemoryEnabled(userData.aiMemoryEnabled !== false)
        if (Array.isArray(convData)) {
          setConversations(convData)
        }
        if (userData.name) {
          setMsgs([{
            who: 'ai',
            text: `Habari ${userData.name}. I'm **Akiba AI**, your money coach. I read your live spending data directly from the database, so my answers are specific to your money — not generic advice. Ask how your week went, where you're overspending, or use a quick question below.`,
          }])
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [msgs, busy, expandedCompressed])

  // Get displayed messages with compression applied
  const getDisplayedMessages = () => {
    if (expandedCompressed || msgs.length <= 9) {
      return msgs.map((m) => ({ ...m, isCompressed: false }))
    }
    return compressMessages(msgs, 6)
  }

  const displayedMessages = getDisplayedMessages()

  const startNewChat = () => {
    setCurrentConversationId(null)
    setMsgs([{
      who: 'ai',
      text: `Habari! I'm **Akiba AI**, your money coach. I read your live spending data directly from the database, so my answers are specific to your money — not generic advice. Ask how your week went, where you're overspending, or use a quick question below.`,
    }])
  }

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`)
      const data = await res.json()
      setCurrentConversationId(convId)
      setMsgs(data.messages.map((m: any) => ({ who: m.role, text: m.content })))
    } catch (e) {
      console.error(e)
    }
  }

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/ai/conversations/${convId}`, { method: 'DELETE' })
      setConversations((cs) => cs.filter((c) => c.id !== convId))
      if (currentConversationId === convId) {
        startNewChat()
      }
      setSuccessMessage('Conversation deleted.')
      setShowSuccessModal(true)
    } catch (e) {
      console.error(e)
    }
    setShowDeleteConfirm(null)
  }

  const toggleMemory = async () => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiMemoryEnabled: !memoryEnabled }),
      })
      setMemoryEnabled(!memoryEnabled)
      setSuccessMessage(memoryEnabled ? 'Memory disabled. Conversations won\'t be saved.' : 'Memory enabled. Conversations will be saved.')
      setShowSuccessModal(true)
    } catch (e) {
      console.error(e)
    }
  }

  const ask = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    const newMsgs: Message[] = [...msgs, { who: 'user' as const, text: question }]
    setMsgs(newMsgs)
    setBusy(true)

    try {
      const compressedContext = getCompressedContext(msgs, 6)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationId: currentConversationId,
          compressedContext,
        }),
      })
      const data = await res.json()
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId)
        // Refresh conversation list
        const convRes = await fetch('/api/ai/conversations')
        const convData = await convRes.json()
        if (Array.isArray(convData)) setConversations(convData)
      }
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
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Sidebar */}
      <motion.div
        style={{
          width: sidebarOpen ? 280 : 0,
          background: 'var(--card)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.3s',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
          <motion.button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 12 }}
            whileTap={{ scale: 0.97 }}
            onClick={startNewChat}
          >
            <I n="plusCircle" size={16} />
            New chat
          </motion.button>

          <button
            onClick={toggleMemory}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 11,
              fontSize: 12,
              fontWeight: 600,
              background: memoryEnabled ? 'var(--primary-soft)' : 'var(--card-2)',
              color: memoryEnabled ? 'var(--primary)' : 'var(--muted)',
              border: `1px solid ${memoryEnabled ? 'var(--primary)' : 'var(--line)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <I n={memoryEnabled ? 'check' : 'lock'} size={12} />
            Memory {memoryEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {conversations.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>
              RECENT CHATS
            </p>
            {conversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                whileHover={{ x: 4 }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  marginBottom: 6,
                  background: currentConversationId === conv.id ? 'var(--primary-soft)' : 'var(--card-2)',
                  color: currentConversationId === conv.id ? 'var(--primary)' : 'var(--text)',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {conv.title}
                </span>
                {currentConversationId === conv.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(conv.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--red)',
                      padding: 0,
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)' }}
            >
              ☰
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Akiba AI</h1>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                {currentConversationId ? 'Conversation with memory' : 'Temporary chat (not saved)'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card-2)', border: '1px solid var(--line)', borderRadius: 99, padding: '6px 14px' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Powered by</span>
            <img
              src="https://curlgvbgasphosyhfncx.supabase.co/storage/v1/object/public/images/images/logos/Google_Gemini_icon_2025.svg.png"
              alt="Google Gemini"
              style={{ width: 18, height: 18, objectFit: 'contain' }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>Gemini</span>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="chat-log" ref={logRef}>
            <AnimatePresence initial={false}>
              {displayedMessages.map((item, i) => {
                const isCompressed = 'isCompressed' in item && item.isCompressed

                if (isCompressed) {
                  return (
                    <motion.div
                      key={`compressed-${i}`}
                      initial={{ opacity: 0, height: 0, y: 20 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <motion.button
                        onClick={() => setExpandedCompressed(!expandedCompressed)}
                        whileHover={{ scale: 1.01, backgroundColor: 'var(--primary-soft)' }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          margin: '12px 0',
                          borderRadius: 12,
                          background: 'var(--card-2)',
                          border: '1px solid var(--line)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 12,
                          color: 'var(--muted)',
                          lineHeight: 1.6,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                            style={{ fontSize: 16, display: 'inline-block' }}
                          >
                            📦
                          </motion.span>
                          <span style={{ fontWeight: 600 }}>
                            {(item as CompressedSection).messageCount} earlier messages compressed
                          </span>
                          <motion.span
                            animate={{ rotate: expandedCompressed ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ marginLeft: 'auto', display: 'inline-block' }}
                          >
                            ▶
                          </motion.span>
                        </div>
                        <motion.div
                          initial={false}
                          animate={{ opacity: expandedCompressed ? 0.5 : 0.8 }}
                          style={{ opacity: 0.8 }}
                        >
                          {(item as CompressedSection).summary}
                        </motion.div>
                      </motion.button>
                    </motion.div>
                  )
                }

                const msg = item as Message
                return (
                  <motion.div
                    key={i}
                    className={'msg ' + msg.who}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut',
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  >
                    {render(msg.text)}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            <AnimatePresence>
              {busy && (
                <motion.div
                  className="msg ai"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.3,
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                  style={{ padding: '14px 18px' }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <motion.div
            className="chat-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <motion.input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending…"
              onKeyDown={(e) => e.key === 'Enter' && !busy && ask()}
              disabled={busy}
              whileFocus={{
                boxShadow: '0 0 0 3px var(--primary-soft)',
              }}
              style={{ transition: 'all 0.2s ease' }}
            />
            <motion.button
              className="send-btn"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => ask()}
              disabled={busy}
              aria-label="Send"
              animate={{ opacity: busy ? 0.6 : 1 }}
            >
              <motion.span
                animate={{ rotate: busy ? 0 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <I n="send" size={16} />
              </motion.span>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Quick questions sidebar */}
      <div style={{ width: 280, background: 'var(--card)', borderLeft: '1px solid var(--line)', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          <I n="zap" size={14} style={{ marginRight: 6 }} />
          Quick questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
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
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>How it works</h4>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            Every question is answered using your live spending data pulled directly from the database — categories, daily totals, repeat items and pace — so the advice is about <b style={{ color: 'var(--text)' }}>your</b> actual money.
          </p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 99 }} onClick={() => setShowDeleteConfirm(null)}>
            <motion.div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                padding: 32,
                maxWidth: 360,
                boxShadow: 'var(--shadow-lg)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Delete conversation?</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 11,
                    fontWeight: 600,
                    background: 'var(--card-2)',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteConversation(showDeleteConfirm)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 11,
                    fontWeight: 600,
                    background: 'var(--red)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Delete
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
