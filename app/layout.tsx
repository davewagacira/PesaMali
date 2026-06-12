import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegisterSW } from '@/components/RegisterSW'

export const metadata: Metadata = {
  title: 'PesaMali · Know your money',
  description: 'Personal finance app for Kenyan students',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PesaMali',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#101828',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  )
}
