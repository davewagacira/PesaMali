import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 })
    }

    const secret = generateSecret()
    const otpauth = generateURI({ label: user.email, secret, issuer: 'PesaMali' })
    const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 2, width: 220 })

    session.mfaSetupSecret = secret
    await session.save()

    return NextResponse.json({ secret, qrDataUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
