import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { verifySync } from 'otplib'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 })
    }

    const result = verifySync({ token: code.replace(/\s/g, ''), secret: user.mfaSecret })
    if (!result?.valid) {
      return NextResponse.json({ error: 'Invalid code — check your authenticator app and try again' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { mfaEnabled: false, mfaSecret: null },
    })

    session.mfaVerified = false
    await session.save()

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
