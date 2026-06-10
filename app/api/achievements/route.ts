import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const achievements = await prisma.achievement.findMany({
      where: { userId: session.userId },
      orderBy: { unlockedAt: 'desc' },
    })

    return NextResponse.json(achievements)
  } catch (e) {
    console.error('[Achievements GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
