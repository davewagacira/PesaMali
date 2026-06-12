import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { publishExpenseEvent } from '@/lib/ably'
import { checkAndAwardAchievements, createNotification } from '@/lib/achievements'
import { processDueRecurringExpenses } from '@/lib/recurring'
import { cleanString, cleanAmount, cleanDateKey, cleanCategory } from '@/lib/validate'
import { isFixedExpense, isRentItem } from '@/lib/metrics'

function nairobiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    key: `${get('year')}-${get('month')}-${get('day')}`,
    monthKey: `${get('year')}-${get('month')}`,
  }
}

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.profileId) await processDueRecurringExpenses(session.profileId)
    const prefix = nairobiDateParts().monthKey
    const expenses = await prisma.expense.findMany({
      where: {
        profileId: session.profileId,
        date: { startsWith: prefix },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(expenses)
  } catch (e) {
    console.error(e)
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
    const date = cleanDateKey(body.date)
    const category = cleanCategory(body.category)
    const item = cleanString(body.item, 120)
    const numAmount = cleanAmount(body.amount)
    if (!date || !category || !item || numAmount === null) {
      return NextResponse.json({ error: 'A valid date, category, item and amount are required' }, { status: 400 })
    }

    const profileId = session.profileId

    // Get profile and check category budget
    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fixed bills (rent, internet) usually auto-log from a recurring template,
    // so a second one in the same month is almost always a double entry.
    // Warn with a 409 unless the client re-submits with force: true.
    if (body.force !== true && isFixedExpense(category, item)) {
      const sameMonth = await prisma.expense.findMany({
        where: { profileId: session.profileId, date: { startsWith: date.slice(0, 7) } },
      })
      const newIsRent = category === 'rent' || isRentItem(item)
      const existing = sameMonth.find((e) =>
        newIsRent
          ? e.category === 'rent' || isRentItem(e.item)
          : e.category === category
      )
      if (existing) {
        return NextResponse.json(
          {
            error: 'This bill appears to be logged already this month',
            duplicateBill: true,
            existing: { date: existing.date, item: existing.item, amount: existing.amount },
          },
          { status: 409 }
        )
      }
    }

    const expense = await prisma.expense.create({
      data: {
        profileId,
        date,
        category,
        item,
        amount: numAmount,
      },
    })

    // Envelope status for this category (null when no budget is set)
    const [categoryBudget, categorySpent] = await Promise.all([
      prisma.categoryBudget.findUnique({
        where: { profileId_category: { profileId, category } },
      }),
      prisma.expense.aggregate({
        where: {
          profileId,
          category,
          date: { startsWith: date.slice(0, 7) },
        },
        _sum: { amount: true },
      }),
    ])

    let envelope: { limit: number; spent: number; remaining: number } | null = null

    if (categoryBudget) {
      const total = categorySpent._sum.amount || 0
      envelope = { limit: categoryBudget.limit, spent: total, remaining: categoryBudget.limit - total }
      if (total > categoryBudget.limit) {
        await createNotification(profileId, {
          type: 'budget_warning',
          title: '⚠️ Category Budget Exceeded',
          message: `You've exceeded your ${category} budget (${total.toLocaleString()} / ${categoryBudget.limit.toLocaleString()})`,
          icon: 'alert',
        })
      }
    }

    // Non-critical side work runs after the response so logging feels instant
    const sideWork = async () => {
      await publishExpenseEvent(profileId, 'add', expense)

      // Check daily safe spend
      const todayInfo = nairobiDateParts()
      const today = todayInfo.key
      const monthStart = `${todayInfo.monthKey}-01`
      const [todaySpent, monthExpenses] = await Promise.all([
        prisma.expense.aggregate({
          where: { profileId, date: today },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { profileId, date: { gte: monthStart } },
          _sum: { amount: true },
        }),
      ])

      const monthSpent = monthExpenses._sum.amount || 0
      const todayTotal = todaySpent._sum.amount || 0
      const daysInMonth = new Date(todayInfo.year, todayInfo.month, 0).getDate()
      const daysLeft = daysInMonth - todayInfo.day + 1
      const priorSpent = monthSpent - todayTotal
      const safeDaily = daysLeft > 0 ? (profile.monthlyBudget - priorSpent - profile.savingsGoal) / daysLeft : 0

      if (todayTotal > safeDaily && safeDaily > 0) {
        await createNotification(profileId, {
          type: 'budget_warning',
          title: 'Daily Safe Spend Exceeded',
          message: `Today's spending (KES ${todayTotal.toLocaleString()}) exceeds safe daily amount (KES ${safeDaily.toLocaleString()})`,
          icon: 'alert',
        })
      }

      // Check and award achievements
      await checkAndAwardAchievements(profileId)
    }
    sideWork().catch((e) => console.error('[Expense side-work error]', e))

    return NextResponse.json({ ...expense, envelope })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
