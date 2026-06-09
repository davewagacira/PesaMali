'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I } from '@/components/Icons'
import { SuccessModal } from '@/components/SuccessModal'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
})

type MfaStep = 'idle' | 'setup' | 'disabling'

export default function SettingsPage() {
  const [b, setB] = useState('15000')
  const [g, setG] = useState('2000')
  const [toast, setToast] = useState<string | null>(null)

  // Profile section state
  const [name, setName] = useState('David Wagacira')
  const [email, setEmail] = useState('davidwagacira26@gmail.com')
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaStep, setMfaStep] = useState<MfaStep>('idle')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaError, setMfaError] = useState('')
  const [secretVisible, setSecretVisible] = useState(false)

  const ping = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => {
        if (d.monthlyBudget) setB(String(d.monthlyBudget))
        if (d.savingsGoal) setG(String(d.savingsGoal))
        setMfaEnabled(!!d.mfaEnabled)
        if (d.name) setName(d.name)
        if (d.email) setEmail(d.email)
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    const nb = parseFloat(b)
    const ng = parseFloat(g)
    if (!nb || nb <= 0) return ping('Enter a valid budget')
    if (ng < 0) return ping('Savings goal cannot be negative')
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: nb, savingsGoal: ng }),
      })
      if (res.ok) {
        setSuccessMessage('Your budget settings have been saved successfully.')
        setShowSuccessModal(true)
      } else ping('Failed to save')
    } catch {
      ping('Network error')
    }
  }

  const saveProfile = async () => {
    if (!name.trim()) return ping('Name cannot be empty')
    setProfileLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setSuccessMessage('Your name has been updated successfully.')
        setShowSuccessModal(true)
      } else {
        ping('Failed to update name')
      }
    } catch {
      ping('Network error')
    } finally {
      setProfileLoading(false)
    }
  }

  const savePassword = async () => {
    setPasswordError('')
    if (!currentPassword) return setPasswordError('Current password is required')
    if (!newPassword) return setPasswordError('New password is required')
    if (newPassword.length < 8) return setPasswordError('New password must be at least 8 characters')
    if (newPassword !== confirmPassword) return setPasswordError('Passwords do not match')

    setProfileLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword, currentPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordFields(false)
        setSuccessMessage('Your password has been changed successfully.')
        setShowSuccessModal(true)
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch {
      setPasswordError('Network error')
    } finally {
      setProfileLoading(false)
    }
  }

  const startSetup = async () => {
    setMfaLoading(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Failed to start setup'); return }
      setQrDataUrl(data.qrDataUrl)
      setMfaSecret(data.secret)
      setMfaStep('setup')
      setMfaCode('')
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaLoading(false)
    }
  }

  const confirmEnable = async () => {
    if (mfaCode.replace(/\s/g, '').length < 6) return
    setMfaLoading(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Invalid code'); setMfaLoading(false); return }
      setMfaEnabled(true)
      setMfaStep('idle')
      setQrDataUrl('')
      setMfaSecret('')
      setMfaCode('')
      setSecretVisible(false)
      setSuccessMessage('Two-factor authentication has been enabled successfully.')
      setShowSuccessModal(true)
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaLoading(false)
    }
  }

  const confirmDisable = async () => {
    if (mfaCode.replace(/\s/g, '').length < 6) return
    setMfaLoading(true)
    setMfaError('')
    try {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error || 'Invalid code'); setMfaLoading(false); return }
      setMfaEnabled(false)
      setMfaStep('idle')
      setMfaCode('')
      setSuccessMessage('Two-factor authentication has been disabled.')
      setShowSuccessModal(true)
    } catch {
      setMfaError('Network error')
    } finally {
      setMfaLoading(false)
    }
  }

  const cancelMfa = () => {
    setMfaStep('idle')
    setMfaCode('')
    setMfaError('')
    setQrDataUrl('')
    setMfaSecret('')
    setSecretVisible(false)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Budget &amp; settings</h1>
          <p>Your money rules</p>
        </div>
      </div>
      <div className="settings-grid">
        <motion.div className="card" {...stagger(0)}>
          <h3><I n="user" size={14} />Profile</h3>
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            />
          </div>
          <motion.button
            className="btn btn-primary"
            whileTap={{ scale: 0.97 }}
            onClick={saveProfile}
            disabled={profileLoading}
            style={{ marginBottom: 12 }}
          >
            {profileLoading ? 'Saving…' : 'Save name'}
          </motion.button>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
              Change password
            </p>
            <AnimatePresence>
              {!showPasswordFields ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPasswordFields(true)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 11,
                    fontWeight: 600,
                    fontSize: 13,
                    background: 'var(--card-2)',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <I n="lock" size={14} style={{ marginRight: 6 }} />
                  Set new password
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="field">
                    <label>Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="field">
                    <label>New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="field">
                    <label>Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setPasswordError('')
                      }}
                      placeholder="Confirm password"
                    />
                  </div>
                  {passwordError && (
                    <p style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>
                      {passwordError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={savePassword}
                      disabled={profileLoading}
                    >
                      {profileLoading ? 'Changing…' : 'Change password'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setShowPasswordFields(false)
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setPasswordError('')
                      }}
                      style={{
                        padding: '12px 20px',
                        borderRadius: 11,
                        fontWeight: 600,
                        fontSize: 14,
                        background: 'var(--card-2)',
                        color: 'var(--muted)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div className="card" {...stagger(1)}>
          <h3><I n="wallet" size={14} />Monthly budget</h3>
          <div className="field">
            <label>Budget for this month (KES)</label>
            <input type="number" value={b} onChange={(e) => setB(e.target.value)} />
          </div>
          <div className="field">
            <label>Savings goal (KES to have left at month end)</label>
            <input type="number" value={g} onChange={(e) => setG(e.target.value)} />
          </div>
          <motion.button className="btn btn-primary" whileTap={{ scale: 0.97 }} onClick={save}>
            Save changes
          </motion.button>
        </motion.div>
        <motion.div className="card" {...stagger(2)}>
          <h3><I n="alert" size={14} />Alert thresholds</h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
            Akiba compares your spending pace against the month&apos;s progress.
          </p>
          {[
            ['var(--green)', 'var(--green-soft)', 'check', 'On track', 'Spending pace at or below month pace'],
            ['var(--amber)', 'var(--amber-soft)', 'alert', 'Slow down', 'Spending up to 15% ahead of pace'],
            ['var(--red)', 'var(--red-soft)', 'flame', 'Danger zone', 'More than 15% ahead — money may run out early'],
          ].map(([c, bg, ic, t, p]) => (
            <div className="thr" key={t}>
              <div className="sw2" style={{ background: bg, color: c }}>
                <I n={ic} size={16} />
              </div>
              <div>
                <b>{t}</b>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* MFA card — full width */}
        <motion.div className="card" style={{ gridColumn: '1 / -1' }} {...stagger(3)}>
          <h3><I n="shield" size={14} />Two-factor authentication</h3>

          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3 }}>
                Authenticator app (TOTP)
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 480 }}>
                Use Google Authenticator, Authy, or any TOTP-compatible app to generate time-based codes.
                You&apos;ll be asked for a code each time you sign in.
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 99,
              background: mfaEnabled ? 'var(--green-soft)' : 'var(--card-2)',
              color: mfaEnabled ? 'var(--green)' : 'var(--muted)',
              fontSize: 12.5, fontWeight: 600, flex: 'none',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {/* Idle state — action buttons */}
          {mfaStep === 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!mfaEnabled ? (
                <motion.button
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '11px 24px' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startSetup}
                  disabled={mfaLoading}
                >
                  {mfaLoading ? 'Loading…' : <><I n="shield" size={15} /> Set up 2FA</>}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setMfaStep('disabling'); setMfaCode(''); setMfaError('') }}
                  style={{
                    padding: '11px 24px', borderRadius: 11, fontWeight: 600, fontSize: 14,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)',
                  }}
                >
                  <I n="lock" size={15} /> Disable 2FA
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Setup flow */}
          <AnimatePresence>
            {mfaStep === 'setup' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginTop: 4 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start' }}>
                  {/* QR Code */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    {qrDataUrl && (
                      <div style={{
                        padding: 12, background: '#fff', borderRadius: 14,
                        border: '1px solid var(--line)', boxShadow: 'var(--shadow)',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrDataUrl} alt="MFA QR code" width={200} height={200} />
                      </div>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', maxWidth: 200 }}>
                      Scan with your authenticator app
                    </p>
                  </div>

                  {/* Steps */}
                  <div>
                    {[
                      { n: '1', t: 'Open your authenticator app', d: 'Google Authenticator, Authy, 1Password, or any TOTP app.' },
                      { n: '2', t: 'Scan the QR code', d: 'Tap the + or "Add account" button in your app, then scan the code on the left.' },
                      { n: '3', t: 'Enter the 6-digit code', d: 'Once scanned, your app will show a rotating 6-digit code. Enter it below to confirm.' },
                    ].map((s) => (
                      <div key={s.n} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-soft)',
                          color: 'var(--primary)', fontWeight: 700, fontSize: 13,
                          display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1,
                        }}>{s.n}</div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.t}</p>
                          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{s.d}</p>
                        </div>
                      </div>
                    ))}

                    {/* Manual secret */}
                    <div style={{
                      background: 'var(--card-2)', border: '1px solid var(--line)',
                      borderRadius: 11, padding: '10px 14px', marginBottom: 18,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <p style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>
                          Can&apos;t scan? Enter this key manually:
                        </p>
                        <button
                          onClick={() => setSecretVisible(!secretVisible)}
                          style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}
                        >
                          {secretVisible ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="mono" style={{
                        fontSize: 13, letterSpacing: 2, wordBreak: 'break-all', lineHeight: 1.8,
                        filter: secretVisible ? 'none' : 'blur(5px)', userSelect: secretVisible ? 'text' : 'none',
                        transition: 'filter .2s',
                      }}>
                        {mfaSecret}
                      </p>
                    </div>

                    {/* Code input */}
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>Confirmation code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="000 000"
                        value={mfaCode}
                        maxLength={7}
                        onChange={(e) => { setMfaCode(e.target.value.replace(/[^\d\s]/g, '')); setMfaError('') }}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, letterSpacing: 4 }}
                      />
                    </div>

                    {mfaError && (
                      <p style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{mfaError}</p>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={confirmEnable}
                        disabled={mfaLoading || mfaCode.replace(/\s/g, '').length < 6}
                      >
                        {mfaLoading ? 'Verifying…' : 'Activate 2FA'}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={cancelMfa}
                        style={{
                          padding: '12px 20px', borderRadius: 11, fontWeight: 600, fontSize: 14,
                          background: 'var(--card-2)', color: 'var(--muted)', border: '1px solid var(--line)',
                        }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Disable flow */}
          <AnimatePresence>
            {mfaStep === 'disabling' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginTop: 4, maxWidth: 400 }}
              >
                <p style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.6, color: 'var(--muted)' }}>
                  To disable two-factor authentication, enter the current 6-digit code from your authenticator app.
                </p>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000 000"
                    value={mfaCode}
                    maxLength={7}
                    onChange={(e) => { setMfaCode(e.target.value.replace(/[^\d\s]/g, '')); setMfaError('') }}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, letterSpacing: 4 }}
                    autoFocus
                  />
                </div>
                {mfaError && (
                  <p style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{mfaError}</p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={confirmDisable}
                    disabled={mfaLoading || mfaCode.replace(/\s/g, '').length < 6}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 11, fontWeight: 600, fontSize: 14,
                      background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8,
                      opacity: mfaCode.replace(/\s/g, '').length < 6 ? 0.6 : 1,
                    }}
                  >
                    {mfaLoading ? 'Disabling…' : 'Confirm disable'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={cancelMfa}
                    style={{
                      padding: '12px 20px', borderRadius: 11, fontWeight: 600, fontSize: 14,
                      background: 'var(--card-2)', color: 'var(--muted)', border: '1px solid var(--line)',
                    }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

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
        title="Success!"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  )
}
