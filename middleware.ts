import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionData, sessionOptions } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/mfa')
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('akiba-session')
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  try {
    const res = NextResponse.next()
    const session = await getIronSession<SessionData>(request, res, sessionOptions)

    if (session.mfaPending && !session.isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/mfa', request.url))
    }

    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  } catch {
    // Malformed session cookie — clear it and redirect
    const redirect = NextResponse.redirect(new URL('/auth', request.url))
    redirect.cookies.delete('akiba-session')
    return redirect
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
