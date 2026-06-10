import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { publishExpenseEvent } from '@/lib/ably'
import { checkAndAwardAchievements, createNotification } from '@/lib/achievements'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}-${month}`
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
    const { date, category, item, amount } = await req.json()
    if (!date || !category || !item || !amount) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Get user and check category budget
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const numAmount = parseFloat(amount)

    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        date,
        category,
        item,
        amount: numAmount,
      },
    })

    // Publish real-time event
    await publishExpenseEvent(session.userId, 'add', expense)

    // Check for budget overspend on this category
    const categoryBudget = await prisma.categoryBudget.findUnique({
      where: { userId_category: { userId: session.userId, category } },
    })

    if (categoryBudget) {
      const categorySpent = await prisma.expense.aggregate({
        where: {
          userId: session.userId,
          category,
          date: { startsWith: date.slice(0, 7) },
        },
        _sum: { amount: true },
      })

      const total = categorySpent._sum.amount || 0
      if (total > categoryBudget.limit) {
        await createNotification(session.userId, {
          type: 'budget_warning',
          title: '⚠️ Category Budget Exceeded',
          message: `You've exceeded your ${category} budget (${total.toLocaleString()} / ${categoryBudget.limit.toLocaleString()})`,
          icon: 'alert',
        })
      }
    }

    // Check daily safe spend
    const today = new Date().toISOString().slice(0, 10)
    const todaySpent = await prisma.expense.aggregate({
      where: {
        userId: session.userId,
        date: today,
      },
      _sum: { amount: true },
    })

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const monthExpenses = await prisma.expense.aggregate({
      where: {
        userId: session.userId,
        date: { gte: monthStart },
      },
      _sum: { amount: true },
    })

    const monthSpent = monthExpenses._sum.amount || 0
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const daysLeft = daysInMonth - new Date().getDate()
    const remaining = user.monthlyBudget - monthSpent
    const safeDaily = daysLeft > 0 ? (remaining - user.savingsGoal) / daysLeft : 0

    if ((todaySpent._sum.amount || 0) > safeDaily && safeDaily > 0) {
      await createNotification(session.userId, {
        type: 'budget_warning',
        title: '⏰ Daily Safe Spend Exceeded',
        message: `Today's spending (KES ${(todaySpent._sum.amount || 0).toLocaleString()}) exceeds safe daily amount (KES ${safeDaily.toLocaleString()})`,
        icon: 'alert',
      })
    }

    // Check and award achievements
    await checkAndAwardAchievements(session.userId)

    return NextResponse.json(expense)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
