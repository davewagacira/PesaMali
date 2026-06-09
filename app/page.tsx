import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'

export default async function Home() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (session.isLoggedIn) {
    redirect('/dashboard')
  } else {
    redirect('/auth')
  }
}
