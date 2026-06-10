'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => { 
        if (d.name) setUserName(d.name)
        if (d.id) setUserId(d.id)
      })
      .catch(() => {})
  }, [])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }

  return (
    <div className="shell">
      <Sidebar userName={userName} theme={theme} onThemeToggle={toggleTheme} />
      <div className="flex flex-col flex-1">
        <Header userName={userName} userId={userId} />
        <main className="main flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
