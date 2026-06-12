import { CATS } from './metrics'

export const MAX_AMOUNT = 100_000_000 // KES — generous ceiling to reject garbage input

const CATEGORY_IDS = new Set(CATS.map((c) => c.id))
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Trims, strips control characters, and enforces a length cap. Returns null when invalid/empty. */
export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(CONTROL_CHARS_RE, '').trim()
  if (!cleaned || cleaned.length > maxLength) return null
  return cleaned
}

export function cleanEmail(value: unknown): string | null {
  const email = cleanString(value, 254)
  if (!email || !EMAIL_RE.test(email)) return null
  return email.toLowerCase()
}

export function cleanPassword(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (value.length < 8 || value.length > 128) return null
  return value
}

/** Positive finite amount within sane bounds. Accepts numeric strings from forms. */
export function cleanAmount(value: unknown, { min = 0.01, max = MAX_AMOUNT } = {}): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  if (n < min || n > max) return null
  return n
}

/** Calendar-valid YYYY-MM-DD key. */
export function cleanDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return null
  const daysInMonth = new Date(y, m, 0).getDate()
  if (d < 1 || d > daysInMonth) return null
  return value
}

export function cleanCategory(value: unknown): string | null {
  if (typeof value !== 'string' || !CATEGORY_IDS.has(value)) return null
  return value
}

export function cleanInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  if (n < min || n > max) return null
  return n
}
