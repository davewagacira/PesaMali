import { prisma } from './prisma'
import { publishExpenseEvent } from './ably'
import { createNotification } from './achievements'

function nairobiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function nextMonthlyDate(currentKey: string, preferredDay?: number | null) {
  const current = dateFromKey(currentKey)
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth() + 1
  const day = preferredDay || current.getUTCDate()
  const nextYear = year + Math.floor(month / 12)
  const nextMonth = month % 12
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth))
  return keyFromDate(new Date(Date.UTC(nextYear, nextMonth, nextDay, 12)))
}

function nextRunDate(currentKey: string, frequency: string, dayOfMonth?: number | null) {
  const current = dateFromKey(currentKey)
  if (frequency === 'monthly') return nextMonthlyDate(currentKey, dayOfMonth)
  if (frequency === 'weekly') {
    current.setUTCDate(current.getUTCDate() + 7)
    return keyFromDate(current)
  }
  if (frequency === 'biweekly') {
    current.setUTCDate(current.getUTCDate() + 14)
    return keyFromDate(current)
  }
  return nextMonthlyDate(currentKey, dayOfMonth)
}

export async function processDueRecurringExpenses(userId?: string) {
  const today = nairobiDateKey()
  const dueRecurring = await prisma.recurringExpense.findMany({
    where: {
      ...(userId ? { userId } : {}),
      active: true,
      nextRunDate: { lte: today },
    },
  })

  let createdCount = 0

  for (const recurring of dueRecurring) {
    let dueDate = recurring.nextRunDate
    let lastRunDate = recurring.lastRunDate
    let guard = 0

    while (dueDate <= today && guard < 24) {
      const alreadyLogged = await prisma.expense.findFirst({
        where: {
          userId: recurring.userId,
          date: dueDate,
          category: recurring.category,
          item: recurring.item,
          amount: recurring.amount,
        },
      })

      if (!alreadyLogged) {
        const expense = await prisma.expense.create({
          data: {
            userId: recurring.userId,
            date: dueDate,
            category: recurring.category,
            item: recurring.item,
            amount: recurring.amount,
          },
        })
        createdCount++
        await publishExpenseEvent(recurring.userId, 'add', expense)
        await createNotification(recurring.userId, {
          type: 'recurring_expense',
          title: 'Recurring expense logged',
          message: `${recurring.item} (${recurring.amount.toLocaleString()}) was added automatically.`,
          actionUrl: '/log',
        })
      }

      lastRunDate = dueDate
      dueDate = nextRunDate(dueDate, recurring.frequency, recurring.dayOfMonth)
      guard++
    }

    await prisma.recurringExpense.update({
      where: { id: recurring.id },
      data: {
        lastRunDate,
        nextRunDate: dueDate,
      },
    })
  }

  return createdCount
}
