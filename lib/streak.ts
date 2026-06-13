// All dates are 'YYYY-MM-DD' strings in Africa/Nairobi timezone (same timezone the
// expense API uses when writing dates). We compare date strings directly so there
// is no UTC offset issue.

function nairobiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00Z') // noon UTC avoids DST edge cases
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns the current streak length.
 *
 * Rules (Snapchat-style):
 *  - A streak day = any calendar day with at least one logged expense.
 *  - If you logged today, the streak is live and includes today.
 *  - If you haven't logged today but logged yesterday, the streak is still
 *    alive (you have until midnight Nairobi time to extend it) — we show
 *    the streak as it stood at end of yesterday rather than resetting to 0.
 *  - If the last logged day is older than yesterday, the streak is 0.
 */
export function computeStreak(dates: string[]): number {
  if (!dates.length) return 0

  const set = new Set(dates)
  const today = nairobiToday()
  const yesterday = addDays(today, -1)

  // Determine where to start counting backward
  let cursor: string
  if (set.has(today)) {
    cursor = today
  } else if (set.has(yesterday)) {
    cursor = yesterday
  } else {
    return 0 // gap of at least 2 days — streak broken
  }

  let streak = 0
  while (set.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/**
 * True when the streak is alive but at risk — logged yesterday, not yet today.
 * The user has until midnight Nairobi time to extend it.
 */
export function isStreakAtRisk(dates: string[]): boolean {
  if (!dates.length) return false
  const set = new Set(dates)
  const today = nairobiToday()
  const yesterday = addDays(today, -1)
  return !set.has(today) && set.has(yesterday)
}

/**
 * Returns hours (floored) remaining until midnight Nairobi time.
 */
export function hoursUntilMidnightNairobi(): number {
  const now = new Date()
  // Get current Nairobi time components
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0')
  const h = get('hour')
  const m = get('minute')
  const s = get('second')
  const secondsElapsed = h * 3600 + m * 60 + s
  const secondsLeft = 86400 - secondsElapsed
  return Math.floor(secondsLeft / 3600)
}
export function computeLongestStreak(dates: string[]): number {
  if (!dates.length) return 0

  const sorted = Array.from(new Set(dates)).sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    const expected = addDays(sorted[i - 1], 1)
    if (sorted[i] === expected) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}
