import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

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
    const expense = await prisma.expense.create({
      data: {
        userId: session.userId,
        date,
        category,
        item,
        amount: parseFloat(amount),
      },
    })
    return NextResponse.json(expense)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
