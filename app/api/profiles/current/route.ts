import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { getEffectiveBudget, nairobiYearMonth } from '@/lib/monthlyBudget'

// GET /api/profiles/current — get the currently active profile
export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'No active profile' }, { status: 404 })
    }
    const profile = await prisma.profile.findUnique({ where: { id: session.profileId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    // Overlay this month's budget so every consumer (dashboard, AI, wishlist…)
    // automatically sees the per-month value instead of the profile default
    const { year, month } = nairobiYearMonth()
    const effective = await getEffectiveBudget(profile.id, year, month, profile)
    return NextResponse.json({
      ...profile,
      monthlyBudget: effective.budget,
      savingsGoal: effective.savingsGoal,
      budgetIsOverride: effective.isOverride,
      defaultMonthlyBudget: profile.monthlyBudget,
      defaultSavingsGoal: profile.savingsGoal,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
