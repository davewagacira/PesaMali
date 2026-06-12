import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { cleanString, cleanPassword, cleanAmount } from '@/lib/validate'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      monthlyBudget: user.monthlyBudget,
      savingsGoal: user.savingsGoal,
      mfaEnabled: user.mfaEnabled,
      aiMemoryEnabled: user.aiMemoryEnabled,
      notificationsEnabled: user.notificationsEnabled,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { monthlyBudget, savingsGoal, name, password, currentPassword, aiMemoryEnabled, notificationsEnabled, pushNotificationsEnabled } = await req.json()

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const bcrypt = await import('bcryptjs')

    // Validate current password if changing password
    if (password !== undefined) {
      if (!cleanPassword(password)) {
        return NextResponse.json({ error: 'Password must be 8-128 characters' }, { status: 400 })
      }
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 })
      }
      const valid = await bcrypt.default.compare(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }
    }

    const updateData: any = {}
    if (monthlyBudget !== undefined) {
      const budget = cleanAmount(monthlyBudget)
      if (budget === null) return NextResponse.json({ error: 'Invalid monthly budget' }, { status: 400 })
      updateData.monthlyBudget = budget
    }
    if (savingsGoal !== undefined) {
      const goal = cleanAmount(savingsGoal, { min: 0 })
      if (goal === null) return NextResponse.json({ error: 'Invalid savings goal' }, { status: 400 })
      updateData.savingsGoal = goal
    }
    if (name !== undefined) {
      const cleanName = cleanString(name, 80)
      if (!cleanName) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
      updateData.name = cleanName
    }
    if (aiMemoryEnabled !== undefined) updateData.aiMemoryEnabled = Boolean(aiMemoryEnabled)
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = Boolean(notificationsEnabled)
    if (pushNotificationsEnabled !== undefined) updateData.pushNotificationsEnabled = Boolean(pushNotificationsEnabled)
    if (password) {
      const hashedPassword = await bcrypt.default.hash(password, 12)
      updateData.password = hashedPassword
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    })

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      monthlyBudget: updatedUser.monthlyBudget,
      savingsGoal: updatedUser.savingsGoal,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
