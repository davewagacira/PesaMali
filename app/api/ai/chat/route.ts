import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { SessionData, sessionOptions } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isFixedCat } from '@/lib/metrics'

// ── Vertex AI (primary) ────────────────────────────────────────────────────────
function getVertexClient(): GoogleGenAI | null {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID
  if (!project) return null

  const location = process.env.VERTEX_AI_LOCATION || 'us-central1'

  // Resolve service-account key file
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const absCredPath = credPath ? resolve(process.cwd(), credPath) : null
  const keyFilename = absCredPath && existsSync(absCredPath) ? absCredPath : undefined

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
    const model = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-1.5-flash'
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

  return null
}

// ── Context builder (reads live DB data) ──────────────────────────────────────
function buildContext(
  user: { name: string; monthlyBudget: number; savingsGoal: number },
  expenses: { date: string; category: string; item: string; amount: number }[],
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
  const fixedSpent = expenses.filter((e) => isFixedCat(e.category)).reduce((s, e) => s + e.amount, 0)
  const flexibleSpent = spent - fixedSpent
  const flexibleBudget = Math.max(user.monthlyBudget - fixedSpent, 0)
  const spendPace = flexibleSpent / Math.max(flexibleBudget, 1)
  const safe = daysLeft > 0 ? (remaining - user.savingsGoal) / daysLeft : 0
  const projected = dayOfMonth > 0 ? fixedSpent + (flexibleSpent / dayOfMonth) * daysInMonth : 0

  const status =
    spendPace <= monthPace ? 'on track' :
    spendPace <= monthPace + 0.15 ? 'slightly ahead of pace' :
    'danger zone — overspending'

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
    .map((e) => `[${e.date}] ${e.category} — ${e.item}: KES ${e.amount.toLocaleString()}`)

  return {
    user: user.name,
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

const OFF_TOPIC_REPLY = "I'm sorry, I can't help with that. I'm PesaMali AI — I only discuss your personal finances. Ask me about your spending, budget, savings goal, or expense habits."

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
function localCoach(question: string, ctx: ReturnType<typeof buildContext>): string {
  const ql = question.toLowerCase()
  const topCat = ctx.categoryBreakdown[0] || 'none recorded'

  const statusLine =
    ctx.status === 'on track'
      ? `You're **on track**: ${ctx.spendPacePct}% of your flexible budget used, ${ctx.monthProgressPct}% of the month gone.`
      : ctx.status === 'slightly ahead of pace'
      ? `You're **slightly ahead of pace** (${ctx.spendPacePct}% of flexible budget spent vs ${ctx.monthProgressPct}% of month). Ease off for a few days.`
      : `**Danger zone**: ${ctx.spendPacePct}% of your flexible budget is spent but only ${ctx.monthProgressPct}% of the month is done.`

  if (ql.includes('week')) {
    const weekTotal = ctx.last7Days.split(' | ')
      .reduce((s, d) => { const m = d.match(/KES ([\d,]+)/); return s + (m ? parseInt(m[1].replace(/,/g, '')) : 0) }, 0)
    return `**Your week**: KES ${weekTotal.toLocaleString()} over 7 days (KES ${Math.round(weekTotal / 7).toLocaleString()}/day). Top category: **${topCat}**.\n\n${statusLine}\n\nSafe to spend today: **KES ${ctx.safeToSpendToday.toLocaleString()}**.`
  }
  if (ql.includes('cut') || ql.includes('overspend') || ql.includes('stop')) {
    return `Most of your money is in **${topCat}**. Top repeat items: ${ctx.topRepeatPurchases.slice(0, 3).join(', ')}.\n\n${statusLine}\n\nTrim 20% from your top category = ~KES ${Math.round(ctx.spent * 0.1).toLocaleString()} freed up this month.`
  }
  if (ql.includes('track') || ql.includes('month') || ql.includes('finish')) {
    return `${statusLine}\n\nAt this pace: **KES ${ctx.projectedMonthEnd.toLocaleString()}** by month-end vs KES ${ctx.budget.toLocaleString()} budget. Stay under **KES ${ctx.safeToSpendToday.toLocaleString()}/day** to protect your KES ${ctx.savingsGoal.toLocaleString()} savings goal.`
  }
  if (ql.includes('tip') || ql.includes('save') || ql.includes('habit') || ql.includes('expensive')) {
    return `Three moves:\n\n1. **KES ${ctx.safeToSpendToday.toLocaleString()} daily ceiling** — one number, easy to track.\n2. **Reduce ${topCat}** by 15% — saves ~KES ${Math.round(ctx.spent * 0.12).toLocaleString()} this month.\n3. **Log before you buy** — entering the cost first cuts impulse spending by ~30%.\n\n${statusLine}`
  }
  return `Spent: **KES ${ctx.spent.toLocaleString()}** | Remaining: **KES ${ctx.remaining.toLocaleString()}** | Safe today: **KES ${ctx.safeToSpendToday.toLocaleString()}** | ${ctx.totalTransactions} transactions logged.\n\nTop category: **${topCat}**. ${statusLine}`
}

function generateTitle(question: string): string {
  // Extract key words from question to create a short title
  const words = question.toLowerCase().split(/\s+/)
  const titleWords = words.filter(
    (w) =>
      w.length > 3 &&
      !['what', 'when', 'where', 'which', 'about', 'your', 'this', 'that', 'have', 'with'].includes(w)
  ).slice(0, 3)

  const title = titleWords.join(' ')
  return title.charAt(0).toUpperCase() + title.slice(1) || 'Conversation'
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions)
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { question, conversationId, compressedContext } = await req.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question required' }, { status: 400 })
    }

    // Layer 1: fast topic guard — block obvious off-topic questions before any AI call
    if (isOffTopic(question)) {
      return NextResponse.json({ text: OFF_TOPIC_REPLY, source: 'guard' })
    }

    // Fetch user and check memory setting
    const userRecord = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!userRecord) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // If conversationId provided, validate ownership
    let conversation = null
    const memoryEnabled = (userRecord as any).aiMemoryEnabled !== false
    if (conversationId && memoryEnabled) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (conversation && conversation.userId !== session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Pull live expenses
    const expenses = await prisma.expense.findMany({
      where: {
        userId: session.userId,
        date: {
          startsWith: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    const now = new Date()
    const ctx = buildContext(userRecord, expenses, now)

    // Build conversation history if memory enabled
    let conversationHistory = ''
    if (conversation && memoryEnabled) {
      conversationHistory = conversation.messages
        .map((m: any) => `${m.role === 'user' ? 'User' : 'PesaMali'}: ${m.content}`)
        .join('\n')
    }

    const systemPrompt = `You are PesaMali, a personal-finance coach inside the PesaMali app. You're casual, direct, and helpful — more like a friend than a robot. Currency is KES.

SCOPE RULE: Only discuss personal finances (spending, budget, savings, categories, habits). If asked anything else (health, politics, relationships, general knowledge, coding, entertainment) reply: "I can't help with that — I only discuss personal finances."

STYLE: Be conversational. Vary your responses — sometimes ask a question, sometimes give advice, sometimes just react to their data. No forced structure. Keep it under 200 words. Use **bold** only for important numbers.
${compressedContext ? `\n\n${compressedContext}\n` : ''}
${conversationHistory ? `\n\nPrevious chat history:\n${conversationHistory}\n` : ''}
Live data for ${ctx.user} — ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}:
Budget: KES ${ctx.budget.toLocaleString()} | Savings goal: KES ${ctx.savingsGoal.toLocaleString()}
Spent: **KES ${ctx.spent.toLocaleString()}** | Remaining: **KES ${ctx.remaining.toLocaleString()}**
Fixed bills paid (rent, internet): KES ${ctx.fixedSpent.toLocaleString()} | Flexible spend: KES ${ctx.flexibleSpent.toLocaleString()} of KES ${ctx.flexibleBudget.toLocaleString()} flexible budget (${ctx.spendPacePct}%)
Month: Day ${ctx.dayOfMonth}/${ctx.daysInMonth} | Status: ${ctx.status} (pace is judged on flexible spend only — fixed bills don't count against pace)
Safe daily spend: KES ${ctx.safeToSpendToday.toLocaleString()} | Projected end: KES ${ctx.projectedMonthEnd.toLocaleString()}
Top spend: ${ctx.categoryBreakdown[0] || 'none yet'} | Last 7 days: ${ctx.last7Days}
Top repeat items: ${ctx.topRepeatPurchases.slice(0, 3).join(', ')}

User: ${question}`

    const aiText = await callAI(systemPrompt)
    const text = aiText ?? localCoach(question, ctx)

    // Save to conversation if memory enabled
    if (memoryEnabled && !conversationId) {
      // Create new conversation
      const newConv = await prisma.conversation.create({
        data: {
          userId: session.userId,
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
