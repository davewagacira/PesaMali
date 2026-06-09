'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')
  const [userName, setUserName] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => { if (d.name) setUserName(d.name) })
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
      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
