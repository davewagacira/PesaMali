import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cleanString, cleanAmount } from '@/lib/validate'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(items)
  } catch (e) {
    console.error('[Wishlist GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const name = cleanString(body.name, 120)
    const price = cleanAmount(body.price)
    if (!name || price === null) {
      return NextResponse.json({ error: 'A valid name and price are required' }, { status: 400 })
    }

    const count = await prisma.wishlistItem.count({ where: { userId: session.userId } })
    if (count >= 100) {
      return NextResponse.json({ error: 'Wishlist is full (max 100 items)' }, { status: 400 })
    }

    const item = await prisma.wishlistItem.create({
      data: { userId: session.userId, name, price },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('[Wishlist POST error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
