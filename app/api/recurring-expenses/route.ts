import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { processDueRecurringExpenses } from '@/lib/recurring'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await processDueRecurringExpenses(session.userId)

    const recurring = await prisma.recurringExpense.findMany({
      where: { userId: session.userId, active: true },
    })

    return NextResponse.json(recurring)
  } catch (e) {
    console.error('[Recurring expenses GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category, item, amount, frequency, dayOfMonth, dayOfWeek } = await req.json()
    if (!category || !item || !amount || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate next run date
    const today = new Date()
    let nextRunDate = new Date(today)

    if (frequency === 'monthly') {
      const day = dayOfMonth || today.getDate()
      nextRunDate.setDate(day)
      if (nextRunDate < today) nextRunDate.setMonth(nextRunDate.getMonth() + 1)
    } else if (frequency === 'weekly') {
      const day = dayOfWeek || today.getDay()
      const daysUntil = (day - today.getDay() + 7) % 7 || 7
      nextRunDate.setDate(nextRunDate.getDate() + daysUntil)
    } else if (frequency === 'biweekly') {
      nextRunDate.setDate(nextRunDate.getDate() + 14)
    }

    const recurring = await prisma.recurringExpense.create({
      data: {
        userId: session.userId,
        category,
        item,
        amount,
        frequency,
        dayOfMonth,
        dayOfWeek,
        nextRunDate: nextRunDate.toISOString().slice(0, 10),
      },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch (e) {
    console.error('[Recurring expenses POST error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Execute recurring expenses (should be called by a cron job)
export async function PATCH(req: NextRequest) {
  try {
    const executed = await processDueRecurringExpenses()
    return NextResponse.json({ executed })
  } catch (e) {
    console.error('[Recurring expenses PATCH error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
