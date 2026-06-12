'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { PageHeroCard } from '@/components/PageHeroCard'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

interface UserProfile {
  name: string
  email: string
  monthlyBudget: number
  savingsGoal: number
  mfaEnabled: boolean
  profileId?: string
}

type MfaStep = 'idle' | 'scanning' | 'confirming' | 'disabling'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})

  const [mfaStep, setMfaStep] = useState<MfaStep>('idle')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaError, setMfaError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then((r) => r.json()),
      fetch('/api/profiles/current').then((r) => r.json())
    ])
      .then(([u, p]) => {
        const merged = { ...u, monthlyBudget: p.monthlyBudget, savingsGoal: p.savingsGoal, profileId: p.id }
        setProfile(merged)
        setFormData(merged)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      const userBody = { name: formData.name }
      const profileBody = { monthlyBudget: formData.monthlyBudget, savingsGoal: formData.savingsGoal }

      await Promise.all([
        fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userBody),
        }),
        formData.profileId ? fetch(`/api/profiles/${formData.profileId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileBody),
        }) : Promise.resolve()
      ])
      setProfile(formData as UserProfile)
      setEditMode(false)
    } catch (e) {
      console.error(e)
    }
  }

  const startMfaSetup = async () => {
    setMfaBusy(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Failed to start setup'); return }
      setQrDataUrl(data.qrDataUrl)
      setMfaSecret(data.secret)
      setMfaStep('scanning')
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaBusy(false)
    }
  }

  const confirmMfaSetup = async () => {
    if (!mfaCode.trim()) return
    setMfaBusy(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Invalid code'); return }
      setProfile((p) => p ? { ...p, mfaEnabled: true } : p)
      setMfaStep('idle')
      setMfaCode('')
      setQrDataUrl('')
      setMfaSecret('')
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaBusy(false)
    }
  }

  const disableMfa = async () => {
    if (!mfaCode.trim()) return
    setMfaBusy(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Invalid code'); return }
      setProfile((p) => p ? { ...p, mfaEnabled: false } : p)
      setMfaStep('idle')
      setMfaCode('')
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaBusy(false)
    }
  }

  const cancelMfa = () => {
    setMfaStep('idle')
    setMfaCode('')
    setMfaError('')
    setQrDataUrl('')
    setMfaSecret('')
  }

  if (isLoading || !profile) {
    return <PageHeroCard icon="user" badge="Account" title="Profile" subtitle="Manage your account information and preferences" />
  }

  return (
    <div>
      <PageHeroCard
        icon="user"
        badge="Account"
        title="Profile"
        subtitle="Manage your account information and preferences"
      >
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2 font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
        >
          <I n={editMode ? 'check' : 'edit'} size={16} />
          {editMode ? 'Save' : 'Edit'}
        </button>
      </PageHeroCard>

      <div className="grid cols-1 gap-6 max-w-2xl">
        <motion.div className="card" {...stagger(0)}>
          <h3>
            <I n="user" size={14} />
            Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--muted)]">Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              ) : (
                <p className="mt-2 text-sm text-[var(--text)]">{profile.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--muted)]">Email</label>
              <p className="mt-2 text-sm text-[var(--text)]">{profile.email}</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="card" {...stagger(1)}>
          <h3>
            <I n="target" size={14} />
            Financial Goals
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--muted)]">Monthly Budget (KES)</label>
              {editMode ? (
                <input
                  type="number"
                  value={formData.monthlyBudget || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) })}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              ) : (
                <p className="mt-2 text-sm text-[var(--text)]">KES {profile.monthlyBudget.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-[var(--muted)]">Savings Goal (KES)</label>
              {editMode ? (
                <input
                  type="number"
                  value={formData.savingsGoal || ''}
                  onChange={(e) => setFormData({ ...formData, savingsGoal: parseFloat(e.target.value) })}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              ) : (
                <p className="mt-2 text-sm text-[var(--text)]">KES {profile.savingsGoal.toLocaleString()}</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="card" {...stagger(2)}>
          <h3>
            <I n="shield" size={14} />
            Security
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Two-Factor Authentication</h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                {profile.mfaEnabled ? 'Your account is protected with an authenticator app.' : 'Add an extra layer of security to your account.'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile.mfaEnabled ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'}`}>
              {profile.mfaEnabled ? '✓ Active' : 'Not set up'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {mfaStep === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                {!profile.mfaEnabled ? (
                  <button
                    onClick={startMfaSetup}
                    disabled={mfaBusy}
                    className="flex items-center gap-2 rounded-lg [background:var(--primary-grad)] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
                  >
                    <I n="shield" size={14} />
                    {mfaBusy ? 'Loading...' : 'Set up authenticator'}
                  </button>
                ) : (
                  <button
                    onClick={() => { setMfaStep('disabling'); setMfaError('') }}
                    className="flex items-center gap-2 rounded-lg border border-[var(--red)] px-4 py-2 text-sm font-semibold text-[var(--red)] transition hover:bg-[var(--red-soft)]"
                  >
                    <I n="trash" size={14} />
                    Disable 2FA
                  </button>
                )}
                {mfaError && <p className="mt-2 text-xs text-[var(--red)]">{mfaError}</p>}
              </motion.div>
            )}

            {mfaStep === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-4">
                <p className="text-sm text-[var(--muted)]">Scan this QR code with <b className="text-[var(--text)]">Google Authenticator</b>, <b className="text-[var(--text)]">Authy</b>, or any TOTP app.</p>
                {qrDataUrl && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="MFA QR code" className="rounded-xl border border-[var(--line)] p-2" width={220} height={220} />
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">Or enter this key manually</p>
                  <code className="block rounded-lg border border-[var(--line)] bg-[var(--card-2)] px-3 py-2 text-xs tracking-widest text-[var(--text)] break-all">{mfaSecret}</code>
                </div>
                <button
                  onClick={() => { setMfaStep('confirming'); setMfaError('') }}
                  className="w-full rounded-lg [background:var(--primary-grad)] py-2 text-sm font-semibold text-white transition active:scale-95"
                >
                  I&apos;ve scanned it — next
                </button>
                <button onClick={cancelMfa} className="w-full rounded-lg border border-[var(--line)] py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)]">
                  Cancel
                </button>
              </motion.div>
            )}

            {mfaStep === 'confirming' && (
              <motion.div key="confirming" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-3">
                <p className="text-sm text-[var(--muted)]">Enter the 6-digit code from your authenticator app to confirm setup.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && confirmMfaSetup()}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-center text-lg font-mono tracking-[0.5em] text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-soft)]"
                />
                {mfaError && <p className="text-xs text-[var(--red)]">{mfaError}</p>}
                <button
                  onClick={confirmMfaSetup}
                  disabled={mfaBusy || mfaCode.length < 6}
                  className="w-full rounded-lg [background:var(--primary-grad)] py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
                >
                  {mfaBusy ? 'Verifying...' : 'Enable 2FA'}
                </button>
                <button onClick={() => setMfaStep('scanning')} className="w-full rounded-lg border border-[var(--line)] py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)]">
                  Back to QR code
                </button>
              </motion.div>
            )}

            {mfaStep === 'disabling' && (
              <motion.div key="disabling" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-3">
                <p className="text-sm text-[var(--muted)]">Enter your authenticator code to confirm you want to disable 2FA.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && disableMfa()}
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-center text-lg font-mono tracking-[0.5em] text-[var(--text)] outline-none transition focus:border-[var(--red)] focus:shadow-[0_0_0_3px_var(--red-soft)]"
                />
                {mfaError && <p className="text-xs text-[var(--red)]">{mfaError}</p>}
                <button
                  onClick={disableMfa}
                  disabled={mfaBusy || mfaCode.length < 6}
                  className="w-full rounded-lg bg-[var(--red)] py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
                >
                  {mfaBusy ? 'Disabling...' : 'Disable 2FA'}
                </button>
                <button onClick={cancelMfa} className="w-full rounded-lg border border-[var(--line)] py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-2)]">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {editMode && (
        <div className="mt-6 flex gap-3 max-w-2xl">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg [background:var(--primary-grad)] px-4 py-2 font-semibold text-white transition active:scale-95"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditMode(false)}
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2 font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
