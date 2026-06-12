import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { cleanCategory, cleanAmount } from '@/lib/validate'

export async function GET(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgets = await prisma.categoryBudget.findMany({
      where: { userId: session.userId },
    })

    return NextResponse.json(budgets)
  } catch (e) {
    console.error('[Category budgets GET error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const category = cleanCategory(body.category)
    const limit = cleanAmount(body.limit)
    if (!category || limit === null) {
      return NextResponse.json({ error: 'Invalid category or limit' }, { status: 400 })
    }

    const budget = await prisma.categoryBudget.upsert({
      where: { userId_category: { userId: session.userId, category } },
      create: { userId: session.userId, category, limit },
      update: { limit },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (e) {
    console.error('[Category budgets POST error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
