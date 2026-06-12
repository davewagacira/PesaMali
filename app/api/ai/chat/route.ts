import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isFixedRecord, catOf } from '@/lib/metrics'
import { cleanString } from '@/lib/validate'
import { getEffectiveBudget, nairobiYearMonth } from '@/lib/monthlyBudget'

// ── Vertex AI (primary) ────────────────────────────────────────────────────────
function getVertexClient(): GoogleGenAI | null {
  // Express mode: API key only. This is the path that works on Vercel, where
  // there is no service-account key file on disk.
  const apiKey = process.env.GOOGLE_VERTEX_API_KEY
  if (apiKey) {
    return new GoogleGenAI({ vertexai: true, apiKey })
  }

  // Service-account mode for local development.
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID
  if (!project) return null

  const location = process.env.VERTEX_AI_LOCATION || 'us-central1'

  // Resolve service-account key file
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const absCredPath = credPath ? resolve(process.cwd(), credPath) : null
  const keyFilename = absCredPath && existsSync(absCredPath) ? absCredPath : undefined
  if (!keyFilename) {
    console.warn('[AI chat] GOOGLE_CLOUD_PROJECT_ID is set but no service-account key file was found — Vertex auth will likely fail. On serverless, set GOOGLE_VERTEX_API_KEY instead.')
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
    ...(keyFilename ? { googleAuthOptions: { keyFilename } } : {}),
  })
}

// ── Google AI Studio (fallback) ────────────────────────────────────────────────
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

async function callAI(prompt: string): Promise<string | null> {
  // 1. Try Vertex AI
  const vertexClient = getVertexClient()
  if (vertexClient) {
    const model = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-001'
    try {
      const res = await vertexClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      const text = res.text
      if (text) return text
    } catch (e) {
      console.warn('[Vertex AI error]', (e as Error).message)
      // Try stable fallback model
      try {
        const res = await vertexClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        })
        const text = res.text
        if (text) return text
      } catch (e2) {
        console.warn('[Vertex AI fallback error]', (e2 as Error).message)
      }
    }
  }

  // 2. Try Google AI Studio (Gemini API)
  const geminiClient = getGeminiClient()
  if (geminiClient) {
    const model = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-2.0-flash'
    try {
      const res = await geminiClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      const text = res.text
      if (text) return text
    } catch (e) {
      console.warn('[Gemini API error]', (e as Error).message)
    }
  }

  if (!vertexClient && !geminiClient) {
    console.error('[AI chat] No AI provider configured — set GOOGLE_VERTEX_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY). Serving the local fallback coach.')
  } else {
    console.error('[AI chat] All AI providers failed — serving the local fallback coach. Check the provider errors above.')
  }
  return null
}

// ── Context builder (reads live DB data) ──────────────────────────────────────
function buildContext(
  user: { name: string; monthlyBudget: number; savingsGoal: number },
  expenses: { date: string; category: string; item: string; amount: number; fixed?: boolean | null }[],
  now: Date
) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysLeft = daysInMonth - dayOfMonth

  const spent = expenses.reduce((s, e) => s + e.amount, 0)
  const remaining = user.monthlyBudget - spent
  const monthPace = dayOfMonth / daysInMonth
  // Mirror the dashboard's pace model: fixed bills (rent, internet) are
  // excluded so a lump-sum payment doesn't read as runaway spending.
  const fixedSpent = expenses.filter((e) => isFixedRecord(e)).reduce((s, e) => s + e.amount, 0)
  const flexibleSpent = spent - fixedSpent
  const flexibleBudget = Math.max(user.monthlyBudget - fixedSpent, 0)
  const spendPace = flexibleSpent / Math.max(flexibleBudget, 1)
  const safe = daysLeft > 0 ? (remaining - user.savingsGoal) / daysLeft : 0
  const projected = dayOfMonth > 0 ? fixedSpent + (flexibleSpent / dayOfMonth) * daysInMonth : 0

  const status =
    spendPace <= monthPace ? 'on track' :
    spendPace <= monthPace + 0.15 ? 'slightly ahead of pace' :
    'danger zone, overspending'

  // Category breakdown
  const byCat: Record<string, number> = {}
  for (const e of expenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount
  const categoryBreakdown = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amt]) => `${name}: KES ${amt.toLocaleString()}`)

  // Last 7 days
  const dayMs = 86_400_000
  const last7: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const key = new Date(now.getTime() - i * dayMs).toISOString().slice(0, 10)
    last7[key] = 0
  }
  for (const e of expenses) if (last7[e.date] !== undefined) last7[e.date] += e.amount
  const last7Summary = Object.entries(last7)
    .map(([d, amt]) => `${d}: KES ${amt.toLocaleString()}`)
    .join(' | ')

  // Weekly split between habits and fixed bills, so reports don't headline
  // a rent payment as runaway spending.
  let weekTotal = 0
  let weekFixed = 0
  const last7Flex: Record<string, number> = Object.fromEntries(Object.keys(last7).map((k) => [k, 0]))
  for (const e of expenses) {
    if (last7[e.date] === undefined) continue
    weekTotal += e.amount
    if (isFixedRecord(e)) weekFixed += e.amount
    else last7Flex[e.date] += e.amount
  }
  const weekFlexible = weekTotal - weekFixed
  const heaviestFlexDay = Object.entries(last7Flex).sort((a, b) => b[1] - a[1])[0]

  const byFlexCat: Record<string, number> = {}
  for (const e of expenses) {
    if (!isFixedRecord(e)) byFlexCat[e.category] = (byFlexCat[e.category] || 0) + e.amount
  }
  const topFlex = Object.entries(byFlexCat).sort((a, b) => b[1] - a[1])[0]
  const topFlexCategory = topFlex ? { name: catOf(topFlex[0]).name, amount: Math.round(topFlex[1]) } : null

  // Repeat items
  const itemCount: Record<string, { n: number; amt: number }> = {}
  for (const e of expenses) {
    if (!itemCount[e.item]) itemCount[e.item] = { n: 0, amt: 0 }
    itemCount[e.item].n++
    itemCount[e.item].amt += e.amount
  }
  const topItems = Object.entries(itemCount)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 5)
    .map(([name, { n, amt }]) => `${name} (${n}x, KES ${amt.toLocaleString()})`)

  // Recent expenses (last 15)
  const recent = expenses.slice(0, 15)
    .map((e) => `[${e.date}] ${e.category}, ${e.item}: KES ${e.amount.toLocaleString()}`)

  return {
    user: user.name,
    firstName: (user.name || '').trim().split(/\s+/)[0] || 'there',
    weekTotal: Math.round(weekTotal),
    weekFixed: Math.round(weekFixed),
    weekFlexible: Math.round(weekFlexible),
    heaviestFlexDay: heaviestFlexDay && heaviestFlexDay[1] > 0
      ? { date: heaviestFlexDay[0], amount: Math.round(heaviestFlexDay[1]) }
      : null,
    topFlexCategory,
    budget: user.monthlyBudget,
    savingsGoal: user.savingsGoal,
    spent: Math.round(spent),
    remaining: Math.round(remaining),
    dayOfMonth,
    daysInMonth,
    daysLeft,
    monthProgressPct: Math.round(monthPace * 100),
    spendPacePct: Math.round(spendPace * 100),
    fixedSpent: Math.round(fixedSpent),
    flexibleSpent: Math.round(flexibleSpent),
    flexibleBudget: Math.round(flexibleBudget),
    status,
    safeToSpendToday: Math.round(safe),
    projectedMonthEnd: Math.round(projected),
    totalTransactions: expenses.length,
    categoryBreakdown,
    last7Days: last7Summary,
    topRepeatPurchases: topItems,
    recentExpenses: recent,
  }
}

const OFF_TOPIC_REPLY = "I'm sorry, I can't help with that. I'm AI Coach, and I only discuss your personal finances. Ask me about your spending, budget, savings goal, or expense habits."

// ── Topic guard ────────────────────────────────────────────────────────────────
// Returns true when the question is clearly unrelated to personal finance.
// This runs before the AI call so off-topic questions never reach Vertex AI.
function isOffTopic(question: string): boolean {
  const q = question.toLowerCase().trim()

  // Short allow-list: phrases that are always finance-related
  const FINANCE_PATTERNS = [
    /spend|spent|spending/,
    /budget|budgeting/,
    /sav(e|ing|ings)/,
    /expens/,
    /money|cash|funds/,
    /kes|shilling/,
    /category|categories/,
    /food|transport|airtime|rent|leisure/,
    /track|tracking/,
    /afford/,
    /cost|price/,
    /buy|bought|purchase/,
    /week|month|daily|today/,
    /how (am|was|is|are)|am i (on|over|under)/,
    /overspend|underspend/,
    /balance|remaining/,
    /habit|tip|advice|suggest/,
    /limit|pace|projection|forecast/,
    /salary|income|earn/,
    /debt|loan|borrow/,
    /report|summary|analys/,
    /what did i|where did|how much/,
  ]

  if (FINANCE_PATTERNS.some((p) => p.test(q))) return false

  // Hard block-list: clearly off-topic domains
  const OFF_TOPIC_PATTERNS = [
    // Health / medicine
    /stomach|headache|pain|sick|fever|ill(ness)?|doctor|hospital|medicine|symptom|disease|hurt/,
    // Politics / geography
    /president|prime minister|government|election|parliament|country|capital city|nation/,
    // General knowledge / trivia
    /who (is|was|are|were)|what (is|are|was) the (capital|population|history|definition)/,
    /explain|define|meaning of|what does .+ mean/,
    /write (a|an|me)|generate|create (a|an)/,
    /recipe|ingredient|cook|bake|food (recipe|how)/,
    // Weather
    /weather|temperature|rain|forecast|climate/,
    // Entertainment
    /movie|film|song|music|artist|celebrity|celebrity|actor|actress|game|sport/,
    // Relationships / personal
    /girlfriend|boyfriend|relationship|love|dating|marry|family|friend/,
    // Coding / tech
    /code|program|function|algorithm|javascript|python|database schema/,
    // Other
    /joke|funny|story|poem|essay|translate|language/,
  ]

  if (OFF_TOPIC_PATTERNS.some((p) => p.test(q))) return true

  // Default: allow — let the AI's system-prompt guardrail handle edge cases
  return false
}

// ── Local fallback coach ───────────────────────────────────────────────────────
// Serves when no AI provider responds. Written to read like a person, not a
// dashboard: it reacts first, weaves numbers into sentences, and never blames
// the user for fixed bills like rent.
function pickOne<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

function weekdayOf(dateKey: string): string {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-KE', { weekday: 'long' })
}

function localCoach(question: string, ctx: ReturnType<typeof buildContext>): string {
  const ql = question.toLowerCase()
  const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`
  const flexCat = ctx.topFlexCategory

  const moodLine =
    ctx.status === 'on track'
      ? pickOne([
          `you're in good shape. Only **${ctx.spendPacePct}%** of your day-to-day money is used and we're already ${ctx.monthProgressPct}% through the month`,
          `your pace is honestly solid: **${ctx.spendPacePct}%** of flexible budget used against ${ctx.monthProgressPct}% of the month gone`,
        ])
      : ctx.status === 'slightly ahead of pace'
      ? pickOne([
          `you're moving a little faster than the month is (**${ctx.spendPacePct}%** used, ${ctx.monthProgressPct}% of the month done). Not a crisis, just worth a couple of calm days`,
          `spending is slightly ahead of the calendar (**${ctx.spendPacePct}%** vs ${ctx.monthProgressPct}%), so a quiet stretch would set you right`,
        ])
      : pickOne([
          `we need to pump the brakes. **${ctx.spendPacePct}%** of your day-to-day money is gone with only ${ctx.monthProgressPct}% of the month behind you`,
          `the pace is running hot: **${ctx.spendPacePct}%** of flexible budget used and we're just ${ctx.monthProgressPct}% in`,
        ])

  if (ql.includes('week') || ql.includes('report')) {
    const opener = pickOne([
      `Alright ${ctx.firstName}, week in review.`,
      `Let me break your week down, ${ctx.firstName}.`,
      `Here's how your week actually went.`,
    ])
    const dayToDay = ctx.weekFlexible > 0
      ? `Day to day you spent **${kes(ctx.weekFlexible)}**, roughly ${kes(ctx.weekFlexible / 7)} a day.`
      : `You barely touched your day-to-day money. Nice and quiet.`
    const fixedNote = ctx.weekFixed > 0
      ? ` ${kes(ctx.weekFixed)} also went out for fixed bills (rent and the like), but that's a commitment, not a habit, so I don't count it against you.`
      : ''
    const colour = [
      flexCat ? `Most of the flexible money went to **${flexCat.name}** (${kes(flexCat.amount)}).` : '',
      ctx.heaviestFlexDay ? `${weekdayOf(ctx.heaviestFlexDay.date)} was your heaviest day at ${kes(ctx.heaviestFlexDay.amount)}.` : '',
    ].filter(Boolean).join(' ')
    return `${opener}\n\n${dayToDay}${fixedNote}${colour ? `\n\n${colour}` : ''}\n\nBig picture, ${moodLine}. If you keep today around **${kes(ctx.safeToSpendToday)}**, you stay right on plan.`
  }

  if (ql.includes('cut') || ql.includes('overspend') || ql.includes('stop')) {
    const target = flexCat
      ? `If you want one lever to pull, it's **${flexCat.name}**. That's where ${kes(flexCat.amount)} of your controllable money has gone. Trimming it by about 20% frees roughly ${kes(flexCat.amount * 0.2)} for the rest of the month.`
      : `There's not much logged yet, so log a few days of spending and I'll point at the exact category to squeeze.`
    const habits = ctx.topRepeatPurchases.length
      ? ` Your usual suspects: ${ctx.topRepeatPurchases.slice(0, 3).join(', ')}. Small things, but they repeat.`
      : ''
    return `${target}${habits}\n\nFor context, ${moodLine}.`
  }

  if (ql.includes('track') || ql.includes('month') || ql.includes('finish')) {
    const margin = ctx.budget - ctx.projectedMonthEnd
    const ending = margin >= ctx.savingsGoal
      ? `at this rate you'd finish around **${kes(ctx.projectedMonthEnd)}** spent, which lands inside your ${kes(ctx.budget)} budget with your savings intact. Keep doing what you're doing.`
      : margin >= 0
      ? `you're projected to finish around **${kes(ctx.projectedMonthEnd)}**, inside the ${kes(ctx.budget)} budget, but it squeezes your ${kes(ctx.savingsGoal)} savings goal. A few lighter days buys that back.`
      : `the current path lands around **${kes(ctx.projectedMonthEnd)}**, which overshoots your ${kes(ctx.budget)} budget. Holding today near ${kes(ctx.safeToSpendToday)} starts bending that curve back.`
    return `So, ${moodLine}. Looking ahead, ${ending}`
  }

  if (ql.includes('tip') || ql.includes('save') || ql.includes('habit') || ql.includes('expensive')) {
    const catTip = flexCat
      ? `your biggest controllable spend is **${flexCat.name}**, so that's where a 15% trim hurts least and saves most (about ${kes(flexCat.amount * 0.15)})`
      : `once a few more expenses are logged I can point at the exact category worth trimming`
    return pickOne([
      `Honestly? Just two things. One number to live by: **${kes(ctx.safeToSpendToday)}** today. And one habit: log the expense *before* you buy, because seeing the number first kills most impulse buys. Beyond that, ${catTip}.\n\nAnd for the record, ${moodLine}.`,
      `Keep it simple: treat **${kes(ctx.safeToSpendToday)}** as today's ceiling, and log purchases before you make them. It's the cheapest self-control trick there is. If you want a bigger win, ${catTip}.\n\nRight now, ${moodLine}.`,
    ])
  }

  return pickOne([
    `Quick pulse: you've spent **${kes(ctx.spent)}** this month and have **${kes(ctx.remaining)}** left, with about ${kes(ctx.safeToSpendToday)} comfortable to spend today. And ${moodLine}. Ask me about your week, what to cut, or whether you'll finish the month okay.`,
    `Here's where you stand, ${ctx.firstName}: **${kes(ctx.remaining)}** still available after spending ${kes(ctx.spent)}, and today roughly ${kes(ctx.safeToSpendToday)} is safe to use. Overall, ${moodLine}. Want the weekly breakdown?`,
  ])
}

function generateTitle(question: string): string {
  const q = question.toLowerCase()
  if (/week|weekly report/.test(q)) return 'Weekly spending report'
  if (/cut back|overspend|stop spending/.test(q)) return 'Where to cut back'
  if (/on track|finish the month/.test(q)) return 'Monthly progress check'
  if (/tip|save more|saving habit/.test(q)) return 'Savings tips'
  if (/most expensive|biggest habit|habit/.test(q)) return 'Top spending habit'
  if (/daily|today|spend today/.test(q)) return 'Daily allowance'
  if (/category|categories/.test(q)) return 'Category breakdown'
  if (/budget/.test(q)) return 'Budget overview'
  if (/report|summary/.test(q)) return 'Spending summary'
  if (/afford|can i buy|wishlist/.test(q)) return 'Affordability check'
  // Fallback: take first 5 meaningful words, title-case
  const stop = new Set(['what', 'when', 'where', 'which', 'about', 'your', 'this', 'that', 'have', 'with', 'give', 'tell', 'show', 'how', 'was', 'did', 'are', 'the', 'and', 'for', 'me', 'my', 'a', 'an'])
  const words = question.split(/\s+/).filter((w) => !stop.has(w.toLowerCase().replace(/[^a-z]/g, ''))).slice(0, 4)
  const title = words.join(' ').replace(/[?.!]+$/, '')
  return title.charAt(0).toUpperCase() + title.slice(1) || 'Conversation'
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const question = cleanString(body.question, 2000)
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined
    const compressedContext =
      typeof body.compressedContext === 'string' ? body.compressedContext.slice(0, 8000) : undefined
    if (!question) {
      return NextResponse.json({ error: 'Question required (max 2000 characters)' }, { status: 400 })
    }

    // Layer 1: fast topic guard — block obvious off-topic questions before any AI call
    if (isOffTopic(question)) {
      return NextResponse.json({ text: OFF_TOPIC_REPLY, source: 'guard' })
    }

    // Fetch profile and check memory setting
    const userRecord = await prisma.profile.findUnique({ where: { id: session.profileId } })
    if (!userRecord) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // If conversationId provided, validate ownership
    let conversation = null
    const memoryEnabled = (userRecord as any).aiMemoryEnabled !== false
    if (conversationId && memoryEnabled) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (conversation && conversation.profileId !== session.profileId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Pull live expenses
    const expenses = await prisma.expense.findMany({
      where: {
        profileId: session.profileId,
        date: {
          startsWith: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    const now = new Date()
    // Budgets can vary month to month — use this month's effective values
    const { year: bYear, month: bMonth } = nairobiYearMonth(now)
    const monthBudget = await getEffectiveBudget(session.profileId, bYear, bMonth, userRecord)
    const ctx = buildContext(
      { ...userRecord, monthlyBudget: monthBudget.budget, savingsGoal: monthBudget.savingsGoal },
      expenses,
      now
    )

    // Build conversation history if memory enabled
    let conversationHistory = ''
    if (conversation && memoryEnabled) {
      conversationHistory = conversation.messages
        .map((m: any) => `${m.role === 'user' ? 'User' : 'PesaMali'}: ${m.content}`)
        .join('\n')
    }

    const systemPrompt = `You are PesaMali, a personal-finance coach inside the PesaMali app. You're casual, direct, and helpful, more like a friend than a robot. Currency is KES.

SCOPE RULE: Only discuss personal finances (spending, budget, savings, categories, habits). If asked anything else (health, politics, relationships, general knowledge, coding, entertainment) reply: "I can't help with that. I only discuss personal finances."

STYLE: Talk like a sharp friend texting back, never like a report. React to their situation first, then weave at most 3-4 numbers naturally into sentences. NEVER answer in "Label: value" format and never dump stats line by line. Never use em dashes. Vary your responses: sometimes ask a short follow-up question, sometimes just react. Treat fixed bills (rent, internet) as commitments, not bad habits, and never scold the user for them. Keep it under 200 words. Use **bold** only for the numbers that matter.
GREETING: If you use the user's name, greet with "Hey [casual first name]". Never "Yo", never the full name. Shorten long names naturally (David → Dave, Alexander → Alex, etc.).
${compressedContext ? `\n\n${compressedContext}\n` : ''}
${conversationHistory ? `\n\nPrevious chat history:\n${conversationHistory}\n` : ''}
Live data for ${ctx.user}, ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}:
Budget: KES ${ctx.budget.toLocaleString()} | Savings goal: KES ${ctx.savingsGoal.toLocaleString()}
Spent: **KES ${ctx.spent.toLocaleString()}** | Remaining: **KES ${ctx.remaining.toLocaleString()}**
Fixed bills paid (rent, internet): KES ${ctx.fixedSpent.toLocaleString()} | Flexible spend: KES ${ctx.flexibleSpent.toLocaleString()} of KES ${ctx.flexibleBudget.toLocaleString()} flexible budget (${ctx.spendPacePct}%)
Month: Day ${ctx.dayOfMonth}/${ctx.daysInMonth} | Status: ${ctx.status} (pace is judged on flexible spend only; fixed bills don't count against pace)
Safe daily spend: KES ${ctx.safeToSpendToday.toLocaleString()} | Projected end: KES ${ctx.projectedMonthEnd.toLocaleString()}
Top spend: ${ctx.categoryBreakdown[0] || 'none yet'} | Top flexible category: ${ctx.topFlexCategory ? `${ctx.topFlexCategory.name} (KES ${ctx.topFlexCategory.amount.toLocaleString()})` : 'none yet'}
This week: KES ${ctx.weekFlexible.toLocaleString()} day-to-day + KES ${ctx.weekFixed.toLocaleString()} fixed bills | Last 7 days: ${ctx.last7Days}
Top repeat items: ${ctx.topRepeatPurchases.slice(0, 3).join(', ')}

User: ${question}`

    const aiText = await callAI(systemPrompt)
    const text = aiText ?? localCoach(question, ctx)

    // Save to conversation if memory enabled
    if (memoryEnabled && !conversationId) {
      // Create new conversation
      const newConv = await prisma.conversation.create({
        data: {
          profileId: session.profileId,
          title: generateTitle(question),
        },
      })
      conversation = newConv
    }

    if (conversation && memoryEnabled) {
      // Save user message and AI response
      await prisma.message.createMany({
        data: [
          { conversationId: conversation.id, role: 'user', content: question },
          { conversationId: conversation.id, role: 'ai', content: text },
        ],
      })
      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })
    }

    return NextResponse.json({
      text,
      source: aiText ? 'ai' : 'local',
      conversationId: conversation?.id,
    })
  } catch (e) {
    console.error('[AI chat error]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
