import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cleanString, cleanAmount, cleanCategory, cleanInt } from '@/lib/validate'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.recurringExpense.findUnique({ where: { id: params.id } })
    if (!existing || existing.profileId !== session.profileId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.category !== undefined) {
      const category = cleanCategory(body.category)
      if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      data.category = category
    }
    if (body.item !== undefined) {
      const item = cleanString(body.item, 120)
      if (!item) return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
      data.item = item
    }
    if (body.amount !== undefined) {
      const amount = cleanAmount(body.amount)
      if (amount === null) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      data.amount = amount
    }
    if (body.frequency !== undefined) {
      if (!['monthly', 'weekly', 'biweekly'].includes(body.frequency)) {
        return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
      }
      data.frequency = body.frequency
    }
    if (body.dayOfMonth !== undefined) {
      const dayOfMonth = body.dayOfMonth === null ? null : cleanInt(body.dayOfMonth, 1, 31)
      if (body.dayOfMonth !== null && dayOfMonth === null) {
        return NextResponse.json({ error: 'Invalid day of month' }, { status: 400 })
      }
      data.dayOfMonth = dayOfMonth
    }
    if (body.dayOfWeek !== undefined) {
      const dayOfWeek = body.dayOfWeek === null ? null : cleanInt(body.dayOfWeek, 0, 6)
      if (body.dayOfWeek !== null && dayOfWeek === null) {
        return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 })
      }
      data.dayOfWeek = dayOfWeek
    }
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.fixed !== undefined) data.fixed = Boolean(body.fixed)

    const recurring = await prisma.recurringExpense.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(recurring)
  } catch (e) {
    console.error('[Recurring expense PUT error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.recurringExpense.findUnique({ where: { id: params.id } })
    if (!existing || existing.profileId !== session.profileId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.recurringExpense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Recurring expense DELETE error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
