import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionData, sessionOptions } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

// Requests per window, keyed by client IP. Auth endpoints are strict (brute
// force), the AI endpoint is expensive (LLM calls), everything else generous.
const LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 5 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
}

function clientIp(request: NextRequest) {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}

/** Same-origin policy for the API: no cross-origin browser access is allowed. */
function isAllowedOrigin(request: NextRequest, origin: string) {
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (requestHost && originHost === requestHost) return true
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return extra.includes(origin)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api')

  if (isApi) {
    // CORS: this API is same-origin only. Preflights get no allow headers for
    // foreign origins, and state-changing requests from them are rejected
    // outright (also acts as CSRF defense in depth).
    const origin = request.headers.get('origin')
    const crossOrigin = origin !== null && !isAllowedOrigin(request, origin)

    if (request.method === 'OPTIONS') {
      if (crossOrigin) return new NextResponse(null, { status: 403 })
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
          Vary: 'Origin',
        },
      })
    }
    if (crossOrigin && !['GET', 'HEAD'].includes(request.method)) {
      return NextResponse.json({ error: 'Cross-origin requests are not allowed' }, { status: 403 })
    }

    const ip = clientIp(request)
    const isAuthPath = pathname.startsWith('/api/auth') || pathname.startsWith('/api/mfa')
    const bucket = isAuthPath ? LIMITS.auth : pathname.startsWith('/api/ai') ? LIMITS.ai : LIMITS.api
    const bucketName = isAuthPath ? 'auth' : pathname.startsWith('/api/ai') ? 'ai' : 'api'
    const result = rateLimit(`${bucketName}:${ip}`, bucket.limit, bucket.windowMs)
    if (!result.ok) return rateLimitResponse(result.retryAfterSeconds)
  }

  // Always allow public routes
  if (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/mfa/verify-login' ||
    // Cron trigger — authenticated by CRON_SECRET inside the route handler.
    (pathname === '/api/recurring-expenses' && request.method === 'PATCH')
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('pesamali-session')
  if (!sessionCookie) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  try {
    const res = NextResponse.next()
    const session = await getIronSession<SessionData>(request, res, sessionOptions)

    if (!session.isLoggedIn) {
      if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (session.mfaPending) return NextResponse.redirect(new URL('/auth/mfa', request.url))
      return NextResponse.redirect(new URL('/auth', request.url))
    }

    // Allow profile API, user API (for header/names), and profile page always
    if (
      pathname.startsWith('/api/profiles') || 
      pathname === '/api/user' || 
      pathname === '/api/auth/logout' ||
      pathname === '/profiles'
    ) {
      return NextResponse.next()
    }

    // If logged in but no profile selected, redirect to profiles page
    if (!session.profileId) {
      return NextResponse.redirect(new URL('/profiles', request.url))
    }

  } catch {
    // Malformed session cookie — clear it and redirect
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const redirect = NextResponse.redirect(new URL('/auth', request.url))
    redirect.cookies.delete('pesamali-session')
    return redirect
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
