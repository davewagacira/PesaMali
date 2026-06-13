import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { id: session.profileId },
      select: { streakResetAt: true },
    })

    const where: Record<string, unknown> = {
      profileId: session.profileId,
      OR: [{ fixed: false }, { fixed: null }],
    }
    // Only count dates on or after the reset date
    if (profile?.streakResetAt) {
      where.date = { gte: profile.streakResetAt }
    }

    const rows = await prisma.expense.findMany({
      where,
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    })

    const dates = rows.map((r) => r.date)
    return NextResponse.json({ dates, resetAt: profile?.streakResetAt ?? null })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/streak/reset — sets streakResetAt to today (Nairobi)
export async function POST() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    await prisma.profile.update({
      where: { id: session.profileId },
      data: { streakResetAt: today },
    })

    return NextResponse.json({ ok: true, resetAt: today })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/streak/reset — sets streakResetAt to today (Nairobi)
export async function POST() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    await prisma.profile.update({
      where: { id: session.profileId },
      data: { streakResetAt: today },
    })

    return NextResponse.json({ ok: true, resetAt: today })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
