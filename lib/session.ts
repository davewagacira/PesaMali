import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  userName: string
  isLoggedIn: boolean
  profileId?: string
  profileName?: string
  mfaVerified?: boolean
  mfaPending?: boolean
  mfaSetupSecret?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'pesamali-session',
  ttl: 60 * 60 * 24 * 7, // 7 days
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}
