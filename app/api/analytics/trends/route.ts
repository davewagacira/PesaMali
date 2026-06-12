import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SessionData, sessionOptions } from '@/lib/session'
import { isFixedExpense } from '@/lib/metrics'

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all historical expenses for this profile
    const expenses = await prisma.expense.findMany({
      where: {
        profileId: session.profileId,
      },
      orderBy: { date: 'asc' }, // sort chronologically
    })

    const groups: Record<string, { amt: number }> = {}

    for (const e of expenses) {
      if (isFixedExpense(e.category, e.item)) continue

      // e.date is YYYY-MM-DD
      const monthKey = e.date.substring(0, 7) // YYYY-MM
      if (!groups[monthKey]) {
        groups[monthKey] = { amt: 0 }
      }
      groups[monthKey].amt += e.amount
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Convert into an array
    const trends = Object.keys(groups).map((key) => {
      const [y, m] = key.split('-')
      const label = `${monthNames[parseInt(m) - 1]} '${y.substring(2)}` // e.g. "Jun '26"
      return {
        monthKey: key,
        label,
        amt: groups[key].amt,
      }
    })

    // Return the last 12 months only, if there are many
    const recentTrends = trends.slice(-12)

    return NextResponse.json(recentTrends)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
