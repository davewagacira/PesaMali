import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cleanAmount, cleanInt } from '@/lib/validate'
import { getEffectiveBudget, nairobiYearMonth } from '@/lib/monthlyBudget'

// GET /api/monthly-budgets?year=2026&month=7 — effective budget for a month
// (falls back to profile defaults when no override exists)
export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = req.nextUrl.searchParams
    const current = nairobiYearMonth()
    const year = params.get('year') ? cleanInt(params.get('year')!, 2000, 2100) : current.year
    const month = params.get('month') ? cleanInt(params.get('month')!, 1, 12) : current.month
    if (year === null || month === null) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    const effective = await getEffectiveBudget(session.profileId, year, month)
    return NextResponse.json({ year, month, ...effective })
  } catch (e) {
    console.error('[Monthly budgets GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/monthly-budgets — set the budget for a specific month
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const year = cleanInt(body.year, 2000, 2100)
    const month = cleanInt(body.month, 1, 12)
    const budget = body.budget !== undefined ? cleanAmount(body.budget) : null
    const savingsGoal = body.savingsGoal !== undefined ? cleanAmount(body.savingsGoal) : null
    if (year === null || month === null || (budget === null && savingsGoal === null)) {
      return NextResponse.json({ error: 'Invalid year, month, or amounts' }, { status: 400 })
    }

    // Missing fields fall back to the current effective values so a user can
    // change just the budget without wiping the savings goal (or vice versa)
    const effective = await getEffectiveBudget(session.profileId, year, month)
    const nextBudget = budget ?? effective.budget
    const nextGoal = savingsGoal ?? effective.savingsGoal

    const row = await prisma.monthlyBudget.upsert({
      where: { profileId_year_month: { profileId: session.profileId, year, month } },
      create: { profileId: session.profileId, year, month, budget: nextBudget, savingsGoal: nextGoal },
      update: { budget: nextBudget, savingsGoal: nextGoal },
    })

    return NextResponse.json({ year: row.year, month: row.month, budget: row.budget, savingsGoal: row.savingsGoal, isOverride: true }, { status: 201 })
  } catch (e) {
    console.error('[Monthly budgets POST error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/monthly-budgets?year=2026&month=7 — revert a month to defaults
export async function DELETE(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = req.nextUrl.searchParams
    const year = params.get('year') ? cleanInt(params.get('year')!, 2000, 2100) : null
    const month = params.get('month') ? cleanInt(params.get('month')!, 1, 12) : null
    if (year === null || month === null) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    await prisma.monthlyBudget.deleteMany({
      where: { profileId: session.profileId, year, month },
    })

    const effective = await getEffectiveBudget(session.profileId, year, month)
    return NextResponse.json({ year, month, ...effective })
  } catch (e) {
    console.error('[Monthly budgets DELETE error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
