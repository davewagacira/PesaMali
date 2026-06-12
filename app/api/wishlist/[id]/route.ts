import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.wishlistItem.findUnique({ where: { id: params.id } })
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.wishlistItem.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Wishlist DELETE error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
