import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password || email.length > 254 || password.length > 128) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    // Accounts may predate email normalization, so try the exact form first.
    const user =
      (await prisma.user.findUnique({ where: { email } })) ||
      (await prisma.user.findUnique({ where: { email: email.toLowerCase() } }))
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)

    if (user.mfaEnabled) {
      session.userId = user.id
      session.userName = user.name
      session.isLoggedIn = false
      session.mfaPending = true
      await session.save()
      return NextResponse.json({ mfaRequired: true })
    }

    session.userId = user.id
    session.userName = user.name
    session.isLoggedIn = true
    session.mfaPending = false
    await session.save()
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      monthlyBudget: user.monthlyBudget,
      savingsGoal: user.savingsGoal,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
