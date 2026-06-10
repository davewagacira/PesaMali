import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { publishExpenseEvent } from '@/lib/ably'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const today = new Date().toISOString().slice(0, 10)

    const dueRecurring = await prisma.recurringExpense.findMany({
      where: {
        active: true,
        nextRunDate: { lte: today },
      },
    })

    for (const recurring of dueRecurring) {
      // Create the expense
      const expense = await prisma.expense.create({
        data: {
          userId: recurring.userId,
          date: today,
          category: recurring.category,
          item: recurring.item,
          amount: recurring.amount,
        },
      })

      // Calculate next run date
      let nextRunDate = new Date(today)
      if (recurring.frequency === 'monthly') {
        nextRunDate.setMonth(nextRunDate.getMonth() + 1)
      } else if (recurring.frequency === 'weekly') {
        nextRunDate.setDate(nextRunDate.getDate() + 7)
      } else if (recurring.frequency === 'biweekly') {
        nextRunDate.setDate(nextRunDate.getDate() + 14)
      }

      // Update recurring expense
      await prisma.recurringExpense.update({
        where: { id: recurring.id },
        data: {
          lastRunDate: today,
          nextRunDate: nextRunDate.toISOString().slice(0, 10),
        },
      })

      // Publish real-time event
      await publishExpenseEvent(recurring.userId, 'add', expense)
    }

    return NextResponse.json({ executed: dueRecurring.length })
  } catch (e) {
    console.error('[Recurring expenses PATCH error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
