import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { publishExpenseEvent } from '@/lib/ably'
import { checkAndAwardAchievements, createNotification } from '@/lib/achievements'
import { processDueRecurringExpenses } from '@/lib/recurring'
import { cleanString, cleanAmount, cleanDateKey, cleanCategory } from '@/lib/validate'

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
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.userId) await processDueRecurringExpenses(session.userId)
    const prefix = nairobiDateParts().monthKey
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.userId,
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
    if (!session.isLoggedIn) {
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

    // Get user and check category budget
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        date,
        category,
        item,
        amount: numAmount,
      },
    })

    // Envelope status for this category (null when no budget is set)
    const userId = session.userId
    const [categoryBudget, categorySpent] = await Promise.all([
      prisma.categoryBudget.findUnique({
        where: { userId_category: { userId, category } },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
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
        await createNotification(userId, {
          type: 'budget_warning',
          title: '⚠️ Category Budget Exceeded',
          message: `You've exceeded your ${category} budget (${total.toLocaleString()} / ${categoryBudget.limit.toLocaleString()})`,
          icon: 'alert',
        })
      }
    }

    // Non-critical side work runs after the response so logging feels instant
    const sideWork = async () => {
      await publishExpenseEvent(userId, 'add', expense)

      // Check daily safe spend
      const todayInfo = nairobiDateParts()
      const today = todayInfo.key
      const monthStart = `${todayInfo.monthKey}-01`
      const [todaySpent, monthExpenses] = await Promise.all([
        prisma.expense.aggregate({
          where: { userId, date: today },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: monthStart } },
          _sum: { amount: true },
        }),
      ])

      const monthSpent = monthExpenses._sum.amount || 0
      const todayTotal = todaySpent._sum.amount || 0
      const daysInMonth = new Date(todayInfo.year, todayInfo.month, 0).getDate()
      const daysLeft = daysInMonth - todayInfo.day + 1
      const priorSpent = monthSpent - todayTotal
      const remaining = user.monthlyBudget - monthSpent
      const safeDaily = daysLeft > 0 ? (user.monthlyBudget - priorSpent - user.savingsGoal) / daysLeft : 0

      if (todayTotal > safeDaily && safeDaily > 0) {
        await createNotification(userId, {
          type: 'budget_warning',
          title: 'Daily Safe Spend Exceeded',
          message: `Today's spending (KES ${todayTotal.toLocaleString()}) exceeds safe daily amount (KES ${safeDaily.toLocaleString()})`,
          icon: 'alert',
        })
      }

      // Check and award achievements
      await checkAndAwardAchievements(userId)
    }
    sideWork().catch((e) => console.error('[Expense side-work error]', e))

    return NextResponse.json({ ...expense, envelope })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
