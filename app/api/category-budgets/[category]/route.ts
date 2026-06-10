import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { category: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { limit } = await req.json()
    if (typeof limit !== 'number' || limit <= 0) {
      return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
    }

    const budget = await prisma.categoryBudget.update({
      where: { userId_category: { userId: session.userId, category: params.category } },
      data: { limit },
    })

    return NextResponse.json(budget)
  } catch (e) {
    console.error('[Category budget PUT error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { category: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.categoryBudget.delete({
      where: { userId_category: { userId: session.userId, category: params.category } },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Category budget DELETE error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
