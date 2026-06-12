'use client'
import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { I } from '@/components/Icons'

export default function MfaPage() {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const handleChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[i] = v
    setDigits(next)
    setError('')
    if (v && i < 5) refs.current[i + 1]?.focus()
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      submit(next.join(''))
    }
  }

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((ch, idx) => { if (idx < 6) next[idx] = ch })
    setDigits(next)
    const focus = Math.min(pasted.length, 5)
    refs.current[focus]?.focus()
    if (pasted.length === 6) submit(pasted)
  }

  const submit = async (code: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid code')
        setDigits(['', '', '', '', '', ''])
        setTimeout(() => refs.current[0]?.focus(), 50)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const code = digits.join('')

  return (
    <div className="auth">
      <div className="auth-left">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PesaMali" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
          PesaMali
        </div>
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Two-factor authentication keeps your money safe.</h1>
          <p>
            Your password was verified. Enter the 6-digit code from your
            authenticator app to complete sign-in.
          </p>
        </motion.div>
        <motion.div
          className="auth-points"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div><I n="shield" size={14} /> TOTP verified</div>
          <div><I n="lock" size={14} /> End-to-end encrypted</div>
          <div><I n="sparkles" size={14} /> 30-second codes</div>
        </motion.div>
      </div>

      <div className="auth-right">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--primary-soft)', color: 'var(--primary)',
              display: 'grid', placeItems: 'center', flex: 'none',
            }}>
              <I n="shield" size={20} />
            </div>
            <h2 style={{ fontSize: 20 }}>Verify your identity</h2>
          </div>
          <div className="sub">
            Open your authenticator app and enter the 6-digit code for PesaMali.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '24px 0 20px' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                style={{
                  width: 48, height: 56, textAlign: 'center',
                  fontSize: 22, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                  background: 'var(--bg)', border: `2px solid ${d ? 'var(--primary)' : 'var(--line)'}`,
                  borderRadius: 12, color: 'var(--text)', outline: 'none',
                  transition: 'border-color .15s, box-shadow .15s',
                  boxShadow: d ? '0 0 0 3px var(--primary-soft)' : 'none',
                }}
              />
            ))}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: 'var(--red)', fontSize: 13, marginBottom: 14, textAlign: 'center' }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            className="btn btn-primary"
            whileTap={{ scale: 0.97 }}
            onClick={() => submit(code)}
            disabled={loading || code.length < 6}
            style={{ opacity: code.length < 6 ? 0.6 : 1 }}
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </motion.button>

          <div className="auth-toggle" style={{ marginTop: 16 }}>
            <a onClick={() => router.push('/auth')}>Back to sign in</a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
