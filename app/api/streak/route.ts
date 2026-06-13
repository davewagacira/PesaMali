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

    // Only count days where the user manually logged at least one expense.
    // Fixed/recurring entries are auto-generated and should not build a streak.
    const rows = await prisma.expense.findMany({
      where: {
        profileId: session.profileId,
        OR: [{ fixed: false }, { fixed: null }],
      },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    })

    const dates = rows.map((r) => r.date)
    return NextResponse.json({ dates })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
