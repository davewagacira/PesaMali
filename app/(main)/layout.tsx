'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('😊')
  const [profileColor, setProfileColor] = useState('#155EEF')
  const [profileType, setProfileType] = useState('personal')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => { 
        if (d.name) setUserName(d.name)
        if (d.id) setUserId(d.id)
      })
      .catch(() => {})
    fetch('/api/profiles/current')
      .then((r) => r.json())
      .then((d) => {
        if (d.name) setProfileName(d.name)
        if (d.avatar) setProfileAvatar(d.avatar)
        if (d.color) setProfileColor(d.color)
        if (d.type) setProfileType(d.type)
      })
      .catch(() => {})
  }, [pathname])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }

  return (
    <div className="shell">
      <Sidebar
        userName={userName}
        theme={theme}
        onThemeToggle={toggleTheme}
        drawerOpen={drawerOpen}
        onDrawerChange={setDrawerOpen}
        profileName={profileName}
        profileAvatar={profileAvatar}
        profileColor={profileColor}
        profileType={profileType}
      />
      <div className="flex flex-col flex-1">
        <Header 
          userName={userName} 
          userId={userId} 
          onMenuClick={() => setDrawerOpen(true)} 
          profileAvatar={profileAvatar}
          profileColor={profileColor}
          profileName={profileName}
        />
        <main className="main flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
