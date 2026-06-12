import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: { profileId: session.profileId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unread = await prisma.notification.count({
      where: { profileId: session.profileId, read: false },
    })

    return NextResponse.json({ notifications, unread })
  } catch (e) {
    console.error('[Notifications GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, read } = await req.json()
    if (typeof id !== 'string') {
      return NextResponse.json({ error: 'Notification id required' }, { status: 400 })
    }

    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: Boolean(read) },
    })

    return NextResponse.json(notification)
  } catch (e) {
    console.error('[Notifications PATCH error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()
    if (typeof id !== 'string') {
      return NextResponse.json({ error: 'Notification id required' }, { status: 400 })
    }

    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Notifications DELETE error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
