import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { publishExpenseEvent } from '@/lib/ably'
import { cleanString } from '@/lib/validate'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expense = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!expense || expense.profileId !== session.profileId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { item } = await req.json()
    const nextItem = cleanString(item, 120)
    if (!nextItem) {
      return NextResponse.json({ error: 'Expense name required (max 120 characters)' }, { status: 400 })
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: { item: nextItem },
    })

    await publishExpenseEvent(session.profileId, 'update', updated)

    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expense = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!expense || expense.profileId !== session.profileId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id: params.id },
    })

    // Publish real-time event
    await publishExpenseEvent(session.profileId, 'delete', { id: params.id })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
