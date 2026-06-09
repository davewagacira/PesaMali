import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  userName: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'akiba-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
}
