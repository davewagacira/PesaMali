import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

function localCoach(q: string, c: Record<string, unknown>): string {
  const top = (c.byCategory as { name: string; amt: number }[])[0] || { name: '—', amt: 0 }
  const ql = q.toLowerCase()
  const spendPacePct = c.spendPacePct as number
  const monthPacePct = c.monthPacePct as number
  const status = c.status as string
  const budget = c.budget as number
  const goal = c.goal as number
  const safeToSpendToday = c.safeToSpendToday as number
  const projectedMonthEndSpend = c.projectedMonthEndSpend as number
  const spent = c.spent as number
  const remaining = c.remaining as number
  const last7Days = c.last7Days as { day: string; amt: number }[]
  const byCategory = c.byCategory as { name: string; amt: number }[]
  const topRepeatItems = c.topRepeatItems as string[]
  const dayOfMonth = c.dayOfMonth as number

  const statusLine =
    status === 'ok'
      ? `You're **on track**: ${spendPacePct}% of budget used with ${monthPacePct}% of the month gone.`
      : status === 'warn'
      ? `You're **slightly ahead of pace**: ${spendPacePct}% of budget used vs ${monthPacePct}% of the month. Ease off for a few days.`
      : `You're in the **danger zone**: ${spendPacePct}% of budget gone but only ${monthPacePct}% of the month. At this rate money runs out early.`

  if (ql.includes('week')) {
    const wk = last7Days.reduce((s, o) => s + o.amt, 0)
    const heavy = [...last7Days].sort((a, b) => b.amt - a.amt)[0]
    return `**Your week in review**\n\nYou spent **KES ${wk.toLocaleString()}** over the last 7 days, about KES ${Math.round(wk / 7).toLocaleString()} per day. Heaviest day: **${heavy.day}** at KES ${heavy.amt.toLocaleString()}. Biggest category this month: **${top.name}** (KES ${top.amt.toLocaleString()}).\n\n${statusLine}\n\nSafe to spend today: **KES ${safeToSpendToday.toLocaleString()}**. Stay under it and your KES ${goal.toLocaleString()} savings goal is protected.`
  }
  if (ql.includes('cut') || ql.includes('overspend') || ql.includes('stop')) {
    const second = byCategory[1]
    return `Your money leaks from **${top.name}** first: KES ${top.amt.toLocaleString()} so far${second ? `, then **${second.name}** at KES ${second.amt.toLocaleString()}` : ''}.\n\nTry a soft weekly cap for ${top.name} of KES ${Math.round((top.amt / dayOfMonth) * 7 * 0.8).toLocaleString()} (20% under your current pace). Repeat purchases worth watching: ${topRepeatItems.join(', ')} — small amounts that compound.\n\n${statusLine}`
  }
  if (ql.includes('track') || ql.includes('month')) {
    return `${statusLine}\n\nAt this pace you'd spend about **KES ${projectedMonthEndSpend.toLocaleString()}** by month end against a KES ${budget.toLocaleString()} budget, leaving **KES ${(budget - projectedMonthEndSpend).toLocaleString()}**. Treat **KES ${safeToSpendToday.toLocaleString()}** as your daily ceiling and the month takes care of itself.`
  }
  if (ql.includes('tip') || ql.includes('save')) {
    return `Three things that will move the needle:\n\n1. **Daily ceiling** — spend at most KES ${safeToSpendToday.toLocaleString()} per day. One number, easy to obey.\n2. **Tame ${top.name}** — your biggest category at KES ${top.amt.toLocaleString()}. Cutting it 15% saves about KES ${Math.round(top.amt * 0.15).toLocaleString()} this month.\n3. **Log before you buy** — entering the expense first makes you feel the cost; impulse buys usually drop by a third.\n\n${statusLine}`
  }
  if (ql.includes('habit') || ql.includes('expensive')) {
    return `Your most repeated purchases: **${topRepeatItems.join(', ')}**. Individually small, together a habit with a price tag. Heaviest category: **${top.name}** at KES ${top.amt.toLocaleString()} (${Math.round((top.amt / Math.max(spent, 1)) * 100)}% of all spending).\n\n${statusLine}`
  }
  return `${statusLine}\n\nQuick numbers: spent **KES ${spent.toLocaleString()}**, remaining **KES ${remaining.toLocaleString()}**, safe to spend today **KES ${safeToSpendToday.toLocaleString()}**. Biggest category: **${top.name}**. Ask about your week, where to cut back, or tips to save more.`
}

export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json()
    if (!question) {
      return NextResponse.json({ error: 'Question required' }, { status: 400 })
    }

    const systemPrompt = `You are Akiba AI, a warm, direct personal-finance coach inside the Akiba app, talking to a Kenyan university student. Currency is KES. Keep answers under 160 words, conversational, specific to the data, with concrete actions. Use **bold** sparingly for key numbers. No emojis. No markdown headers.

Live user data (this month): ${JSON.stringify(context)}

User question: ${question}`

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(systemPrompt)
      const text = result.response.text()
      return NextResponse.json({ text })
    } catch {
      const text = localCoach(question, context)
      return NextResponse.json({ text })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
