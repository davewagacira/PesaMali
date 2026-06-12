import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

// POST /api/profiles/select — set the active profile in the session
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { profileId } = await req.json()
    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile || profile.userId !== session.userId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    session.profileId = profile.id
    session.profileName = profile.name
    await session.save()
    return NextResponse.json({ success: true, profileId: profile.id, profileName: profile.name })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
