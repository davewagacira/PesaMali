import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'
import Landing from '@/components/Landing'

export default async function Home() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions)
  if (session.isLoggedIn) {
    redirect('/profiles')
  }
  return <Landing />
}
