import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { processDueRecurringExpenses } from '@/lib/recurring'
import { cleanString, cleanAmount, cleanCategory, cleanInt } from '@/lib/validate'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await processDueRecurringExpenses(session.profileId)

    const recurring = await prisma.recurringExpense.findMany({
      where: { profileId: session.profileId, active: true },
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
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const category = cleanCategory(body.category)
    const item = cleanString(body.item, 120)
    const amount = cleanAmount(body.amount)
    const frequency = ['monthly', 'weekly', 'biweekly'].includes(body.frequency) ? body.frequency : null
    const dayOfMonth = body.dayOfMonth == null ? null : cleanInt(body.dayOfMonth, 1, 31)
    const dayOfWeek = body.dayOfWeek == null ? null : cleanInt(body.dayOfWeek, 0, 6)
    if (!category || !item || amount === null || !frequency) {
      return NextResponse.json({ 
        error: `Validation failed: category=${!!category}, item=${!!item}, amount=${amount}, frequency=${!!frequency}` 
      }, { status: 400 })
    }
    if ((body.dayOfMonth != null && dayOfMonth === null) || (body.dayOfWeek != null && dayOfWeek === null)) {
      return NextResponse.json({ 
        error: `Invalid day/week: dayOfMonth=${dayOfMonth} (input: ${body.dayOfMonth}), dayOfWeek=${dayOfWeek} (input: ${body.dayOfWeek})` 
      }, { status: 400 })
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
        profileId: session.profileId,
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
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// Execute recurring expenses for all users (called by a cron job).
// Requires the CRON_SECRET env var as a bearer token — without it the
// endpoint stays disabled rather than running unauthenticated.
export async function PATCH(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    const auth = req.headers.get('authorization')
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const executed = await processDueRecurringExpenses()
    return NextResponse.json({ executed })
  } catch (e) {
    console.error('[Recurring expenses PATCH error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
