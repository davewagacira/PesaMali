'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { I } from '@/components/Icons'

export default function AuthPage() {
  const [signup, setSignup] = useState(false)
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
        <div className="brand">
          <div className="logo">A</div> Akiba
        </div>
        <motion.div
          className="auth-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>End the month with money left.</h1>
          <p>
            Akiba tracks every shilling, shows you one clear number that&apos;s safe to spend
            today, and an AI coach tells you the truth about your habits before the 20th catches
            you off guard.
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
            <input ref={emailRef} type="email" defaultValue="dave@email.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input ref={passwordRef} type="password" defaultValue="password" />
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
