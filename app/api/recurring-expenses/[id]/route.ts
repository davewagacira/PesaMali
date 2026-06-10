import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category, item, amount, frequency, dayOfMonth, dayOfWeek, active } = await req.json()

    const recurring = await prisma.recurringExpense.update({
      where: { id: params.id },
      data: {
        ...(category && { category }),
        ...(item && { item }),
        ...(amount && { amount }),
        ...(frequency && { frequency }),
        ...(dayOfMonth !== undefined && { dayOfMonth }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(active !== undefined && { active }),
      },
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
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
