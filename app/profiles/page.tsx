'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { I } from '@/components/Icons'

const AVATARS = [
  'wallet', 'piggy', 'chart', 'trophy', 'sparkles', 
  'sun', 'moon', 'home', 'bus', 'film', 
  'send', 'bulb', 'target', 'flame', 'shield', 
  'crown', 'flag', 'coins', 'sprout', 'book', 
  'bot', 'zap', 'shoppingBag', 'droplet', 'wifi'
]

const COLORS = [
  '#155EEF', '#7A5AF8', '#D92D20', '#079455', '#DC6803',
  '#0BA5EC', '#E31B54', '#6938EF', '#026AA2', '#067647',
]

const PROFILE_TYPES = [
  { id: 'budget', label: 'Budget', icon: 'wallet', desc: 'Track a given budget (e.g. from parents)' },
  { id: 'personal', label: 'My Money', icon: 'user', desc: 'Track your own earned income' },
  { id: 'business', label: 'Business', icon: 'chart', desc: 'Business & freelance finances' },
  { id: 'savings', label: 'Savings', icon: 'piggy', desc: 'Dedicated savings tracking' },
]

// Helper to map old emojis from DB to new Lucide icons if they exist
const mapLegacyAvatar = (avatar: string) => {
  const map: Record<string, string> = {
    '🎓': 'book',
    '💻': 'bot',
    '💼': 'wallet',
    '🚀': 'zap',
    '💎': 'sparkles',
    '😊': 'user',
  }
  return map[avatar] || avatar
}

interface Profile {
  id: string
  name: string
  avatar: string
  color: string
  type: string
  monthlyBudget: number
  savingsGoal: number
}

function ProfileCard({ profile, onClick, onEdit, selected }: { profile: Profile; onClick: () => void; onEdit?: () => void; selected?: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      id={`profile-card-${profile.id}`}
      className="profile-card group relative"
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        '--profile-color': profile.color,
      } as React.CSSProperties}
    >
      <motion.div
        className="profile-avatar-wrap"
        animate={{
          boxShadow: hovered
            ? `0 0 0 3px ${profile.color}40, 0 20px 50px ${profile.color}30`
            : `0 0 0 0px transparent, 0 8px 24px rgba(0,0,0,0.12)`,
        }}
        transition={{ duration: 0.2 }}
        style={{ background: `${profile.color}18`, border: `2px solid ${profile.color}30` }}
      >
        <span className="profile-avatar-emoji" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><I n={mapLegacyAvatar(profile.avatar)} size={32} /></span>
        {selected && (
          <motion.span
            className="profile-avatar-check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ background: profile.color }}
          >
            <I n="check" size={12} />
          </motion.span>
        )}
      </motion.div>
      {onEdit && (
        <div
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-2 right-2 p-1.5 rounded-md text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)] transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
        >
          <I n="edit" size={14} />
        </div>
      )}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="profile-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: `radial-gradient(ellipse at center, ${profile.color}20 0%, transparent 70%)` }}
          />
        )}
      </AnimatePresence>
      <span className="profile-name">{profile.name}</span>
      <span className="profile-type-label" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <I n={PROFILE_TYPES.find(t => t.id === profile.type)?.icon || 'user'} size={12} />
        {PROFILE_TYPES.find(t => t.id === profile.type)?.label || profile.type}
      </span>
    </motion.button>
  )
}

function AddProfileCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      id="add-profile-btn"
      className="profile-card profile-card-add"
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <motion.div
        className="profile-avatar-wrap profile-avatar-add"
        animate={{ background: hovered ? 'rgba(21,94,239,0.12)' : 'rgba(21,94,239,0.06)' }}
      >
        <motion.div animate={{ rotate: hovered ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <I n="plus" size={28} style={{ color: 'var(--primary)' }} />
        </motion.div>
      </motion.div>
      <span className="profile-name" style={{ color: 'var(--muted)' }}>Add Profile</span>
      <span className="profile-type-label">&nbsp;</span>
    </motion.button>
  )
}

function CreateProfileModal({ onClose, onCreate, initialData }: { onClose: () => void; onCreate: (profile: Profile) => void; initialData?: Profile }) {
  const [step, setStep] = useState(initialData ? 1 : 0) // 0: pick type, 1: customize
  const [type, setType] = useState(initialData?.type || 'personal')
  const [name, setName] = useState(initialData?.name || '')
  const [avatar, setAvatar] = useState(initialData?.avatar || 'user')
  const [color, setColor] = useState(initialData?.color || '#155EEF')
  const [budget, setBudget] = useState(initialData?.monthlyBudget?.toString() || '15000')
  const [savings, setSavings] = useState(initialData?.savingsGoal?.toString() || '2000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedType = PROFILE_TYPES.find(t => t.id === type)!

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a profile name'); return }
    setLoading(true)
    setError('')
    try {
      const method = initialData ? 'PUT' : 'POST'
      const url = initialData ? `/api/profiles/${initialData.id}` : '/api/profiles'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar, color, type, monthlyBudget: parseFloat(budget) || 15000, savingsGoal: parseFloat(savings) || 2000 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || `Failed to ${initialData ? 'update' : 'create'} profile`); return }
      onCreate(data)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <motion.div
      className="profile-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="profile-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="profile-modal-head">
          <div>
            <h2>{step === 0 ? 'Choose profile type' : (initialData ? 'Edit your profile' : 'Customize your profile')}</h2>
            <p>{step === 0 ? 'What kind of money will this profile track?' : 'Make it yours'}</p>
          </div>
          <button className="profile-modal-close" onClick={onClose} aria-label="Close">
            <I n="x" size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div key="step0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="profile-type-grid">
                {PROFILE_TYPES.map(t => (
                  <button
                    key={t.id}
                    id={`profile-type-${t.id}`}
                    className={'profile-type-btn' + (type === t.id ? ' sel' : '')}
                    onClick={() => setType(t.id)}
                  >
                    <span className="profile-type-icon"><I n={t.icon} size={20} /></span>
                    <b>{t.label}</b>
                    <p>{t.desc}</p>
                  </button>
                ))}
              </div>
              <motion.button
                id="profile-type-next"
                className="profile-modal-action"
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep(1)}
              >
                Continue <I n="chevronRight" size={16} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {/* Preview */}
              <div className="profile-modal-preview">
                <div
                  className="profile-modal-avatar"
                  style={{ background: `${color}18`, border: `2px solid ${color}40`, boxShadow: `0 8px 24px ${color}30` }}
                >
                  <span style={{ fontSize: 40, display: 'flex' }}><I n={mapLegacyAvatar(avatar)} size={40} /></span>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 750, color: 'var(--text)' }}>{name || 'My Profile'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><I n={selectedType.icon} size={14} /> {selectedType.label}</div>
                </div>
              </div>

              {/* Name */}
              <div className="profile-field">
                <label>Profile name</label>
                <input
                  id="profile-name-input"
                  placeholder={`e.g. ${selectedType.label} Profile`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  maxLength={24}
                />
              </div>

              {/* Avatar picker */}
              <div className="profile-field">
                <label>Choose avatar</label>
                <div className="profile-avatar-grid">
                  {AVATARS.map(em => (
                    <button
                      key={em}
                      className={'profile-avatar-opt' + (avatar === em ? ' sel' : '')}
                      onClick={() => setAvatar(em)}
                      style={avatar === em ? { background: `${color}20`, borderColor: color } : {}}
                    >
                      <I n={mapLegacyAvatar(em)} size={24} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="profile-field">
                <label>Profile color</label>
                <div className="profile-color-row">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={'profile-color-swatch' + (color === c ? ' sel' : '')}
                      onClick={() => setColor(c)}
                      style={{ background: c, boxShadow: color === c ? `0 0 0 3px ${c}50` : 'none' }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              {/* Budget settings */}
              <div className="profile-field-row">
                <div className="profile-field">
                  <label>Monthly budget (KES)</label>
                  <input id="profile-budget-input" type="number" value={budget} onChange={e => setBudget(e.target.value)} />
                </div>
                <div className="profile-field">
                  <label>Savings goal (KES)</label>
                  <input id="profile-savings-input" type="number" value={savings} onChange={e => setSavings(e.target.value)} />
                </div>
              </div>

              {error && <p className="profile-modal-error">{error}</p>}

              <div className="profile-modal-actions">
                <button className="profile-modal-back" onClick={() => setStep(0)}>
                  <I n="chevronLeft" size={14} /> Back
                </button>
                <motion.button
                  id="profile-create-btn"
                  className="profile-modal-action"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? (initialData ? 'Saving…' : 'Creating…') : <>{initialData ? 'Save changes' : 'Create profile'} <I n="check" size={16} /></>}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [userName, setUserName] = useState('')
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/profiles').then(r => r.json()),
      fetch('/api/user').then(r => r.json()),
    ]).then(([profs, user]) => {
      setProfiles(Array.isArray(profs) ? profs : [])
      if (user?.name) setUserName(user.name)
      setLoading(false)
    }).catch(err => {
      console.error('Error loading profiles:', err)
      setLoading(false)
    })
  }, [])

  const handleSelect = async (profileId: string) => {
    setSelecting(profileId)
    try {
      const res = await fetch('/api/profiles/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      if (res.ok) {
        await new Promise(r => setTimeout(r, 500)) // let animation play
        router.push('/dashboard')
      }
    } finally {
      setSelecting(null)
    }
  }

  const handleProfileCreated = (profile: Profile) => {
    setProfiles(prev => [...prev, profile])
    setShowCreate(false)
    // auto-select if it's the first
    if (profiles.length === 0) {
      handleSelect(profile.id)
    }
  }

  return (
    <div className="profiles-page" ref={containerRef}>
      {/* Background gradient orbs */}
      <div className="profiles-bg-orb orb1" />
      <div className="profiles-bg-orb orb2" />
      <div className="profiles-bg-orb orb3" />

      {/* Logo + brand */}
      <motion.div
        className="profiles-brand"
        initial={{ opacity: 0, y: -20, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        transition={{ duration: 0.5 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="PesaMali" className="profiles-logo" />
        <span className="profiles-brand-name">PesaMali</span>
      </motion.div>

      <motion.div
        className="profiles-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="profiles-header">
          {userName && (
            <h1 className="profiles-title">Welcome back, {userName} 👋</h1>
          )}
          <p className="profiles-subtitle">
            {loading ? 'Loading…' : "Which space are we focusing on?"}
          </p>
        </div>

        {loading ? (
          <div className="profiles-grid">
            {[1, 2].map(i => (
              <div key={i} className="profile-card profile-card-skeleton">
                <div className="profile-avatar-wrap skeleton-pulse" />
                <div className="skeleton-line" style={{ width: 70, marginTop: 12 }} />
                <div className="skeleton-line" style={{ width: 50, marginTop: 6 }} />
              </div>
            ))}
          </div>
        ) : (
          <motion.div className="profiles-grid" layout>
            <AnimatePresence>
              {profiles.map((profile, i) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 350, damping: 28 }}
                  layout
                >
                  <ProfileCard
                    profile={profile}
                    onClick={() => handleSelect(profile.id)}
                    onEdit={() => setEditingProfile(profile)}
                    selected={selecting === profile.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {profiles.length < 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: profiles.length * 0.08, type: 'spring', stiffness: 350, damping: 28 }}
              >
                <AddProfileCard onClick={() => setShowCreate(true)} />
              </motion.div>
            )}
          </motion.div>
        )}

        {selecting && (
          <motion.div
            className="profiles-selecting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="profiles-selecting-dot" />
            Entering profile…
          </motion.div>
        )}

        <button
          className="profiles-logout"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/auth'
          }}
        >
          <I n="logout" size={14} /> Sign out
        </button>
      </motion.div>

      <AnimatePresence>
        {(showCreate || editingProfile) && (
          <CreateProfileModal
            initialData={editingProfile || undefined}
            onClose={() => { setShowCreate(false); setEditingProfile(null); }}
            onCreate={(profile) => {
              if (editingProfile) {
                setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p))
              } else {
                handleProfileCreated(profile)
              }
              setShowCreate(false)
              setEditingProfile(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
