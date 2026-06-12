'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})

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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Two-Factor Authentication</h4>
                <p className="text-xs text-[var(--muted)] mt-1">{profile.mfaEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile.mfaEnabled ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'}`}>
                {profile.mfaEnabled ? '✓ Active' : 'Not set up'}
              </span>
            </div>
          </div>
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
