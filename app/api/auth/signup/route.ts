import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { cleanString, cleanEmail, cleanPassword, cleanAmount } from '@/lib/validate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = cleanString(body.name, 80)
    const email = cleanEmail(body.email)
    const password = cleanPassword(body.password)
    if (!name || !email) {
      return NextResponse.json({ error: 'A valid name and email are required' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Password must be 8-128 characters' }, { status: 400 })
    }
    const monthlyBudget = body.monthlyBudget === undefined ? 15000 : cleanAmount(body.monthlyBudget)
    if (monthlyBudget === null) {
      return NextResponse.json({ error: 'Invalid monthly budget' }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
    })
    // Auto-create the first default profile (Budget profile)
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        name: `${name.split(' ')[0]}'s Budget`,
        avatar: '🎓',
        color: '#155EEF',
        type: 'budget',
        monthlyBudget: monthlyBudget || 15000,
        savingsGoal: 2000,
      },
    })
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    session.userId = user.id
    session.userName = user.name
    session.isLoggedIn = true
    await session.save()
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profileId: profile.id,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
