import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

// GET /api/profiles — list all profiles for the logged-in user
export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const profiles = await prisma.profile.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(profiles)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/profiles — create a new profile
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { name, avatar, color, type, monthlyBudget, savingsGoal } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 })
    }

    // Check profile limit (max 5 per user)
    const count = await prisma.profile.count({ where: { userId: session.userId } })
    if (count >= 5) {
      return NextResponse.json({ error: 'Maximum 5 profiles allowed' }, { status: 400 })
    }

    const profile = await prisma.profile.create({
      data: {
        userId: session.userId,
        name,
        avatar: avatar || '😊',
        color: color || '#155EEF',
        type: type || 'personal',
        monthlyBudget: monthlyBudget || 15000,
        savingsGoal: savingsGoal || 2000,
      },
    })
    return NextResponse.json(profile)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
