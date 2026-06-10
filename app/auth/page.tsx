'use client'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { I } from '@/components/Icons'

export default function AuthPage() {
  const [signup, setSignup] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setSignup(true)
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const budgetRef = useRef<HTMLInputElement>(null)

  const enter = async () => {
    setError('')
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        email: emailRef.current?.value,
        password: passwordRef.current?.value,
      }
      if (signup) {
        body.name = nameRef.current?.value
        body.monthlyBudget = parseFloat(budgetRef.current?.value || '15000')
      }
      const res = await fetch(signup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else if (data.mfaRequired) {
        router.push('/auth/mfa')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-left">
        <button className="auth-back" onClick={() => { window.location.href = '/' }}>
          <I n="logout" size={15} style={{ transform: 'scaleX(-1)' }} /> Back to home
        </button>
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Akiba" style={{ width: 36, height: 36, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />
          <div className="sidebar-brand-copy">
            <span>Akiba</span>
            <small>Smart money moves.</small>
          </div>
        </div>
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Turn spending into financial intelligence.</h1>
          <p>
            Akiba transforms daily transactions into real-time insight, helping people understand
            their money, adjust faster, and build stronger financial habits with AI-guided clarity.
          </p>
        </motion.div>
        <motion.div
          className="auth-points"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <I n="target" size={14} /> Safe-to-spend daily
          </div>
          <div>
            <I n="barChart" size={14} /> Live analytics
          </div>
          <div>
            <I n="sparkles" size={14} /> AI money coach
          </div>
        </motion.div>
      </div>
      <div className="auth-right">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <button className="auth-back auth-back-mobile" onClick={() => { window.location.href = '/' }}>
            <I n="logout" size={15} style={{ transform: 'scaleX(-1)' }} /> Back to home
          </button>
          <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
          <div className="sub">
            {signup
              ? 'Your own dashboard, your own money rules'
              : 'Sign in to your Akiba dashboard'}
          </div>
          {signup && (
            <div className="field">
              <label>Full name</label>
              <input ref={nameRef} placeholder="Dave" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input ref={emailRef} type="email" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              ref={passwordRef}
              type="password"
              placeholder="••••••••"
              autoComplete={signup ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && !loading && enter()}
            />
          </div>
          {signup && (
            <div className="field">
              <label>Monthly budget (KES)</label>
              <input ref={budgetRef} type="number" defaultValue="15000" />
            </div>
          )}
          {error && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}
          <motion.button
            className="btn btn-primary"
            whileTap={{ scale: 0.97 }}
            onClick={enter}
            disabled={loading}
          >
            {loading ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </motion.button>
          <div className="auth-toggle">
            {signup ? 'Already have an account? ' : 'New to Akiba? '}
            <a onClick={() => setSignup(!signup)}>
              {signup ? 'Sign in' : 'Create an account'}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
