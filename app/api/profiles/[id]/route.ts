import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'

// PUT /api/profiles/[id] — update a profile
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const profile = await prisma.profile.findUnique({ where: { id: params.id } })
    if (!profile || profile.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { name, avatar, color, type, monthlyBudget, savingsGoal } = await req.json()
    const updated = await prisma.profile.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(color !== undefined && { color }),
        ...(type !== undefined && { type }),
        ...(monthlyBudget !== undefined && { monthlyBudget }),
        ...(savingsGoal !== undefined && { savingsGoal }),
      },
    })
    // If session's current profile is the one being updated, refresh name
    if (session.profileId === params.id && name) {
      session.profileName = name
      await session.save()
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/profiles/[id] — delete a profile
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const profile = await prisma.profile.findUnique({ where: { id: params.id } })
    if (!profile || profile.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Don't allow deleting if it's the only profile
    const count = await prisma.profile.count({ where: { userId: session.userId } })
    if (count <= 1) {
      return NextResponse.json({ error: 'Cannot delete your only profile' }, { status: 400 })
    }
    await prisma.profile.delete({ where: { id: params.id } })
    // Clear session profile if it was the active one
    if (session.profileId === params.id) {
      session.profileId = undefined
      session.profileName = undefined
      await session.save()
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
