import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  userName: string
  isLoggedIn: boolean
  mfaVerified?: boolean
  mfaPending?: boolean
  mfaSetupSecret?: string
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'pesamali-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
}
