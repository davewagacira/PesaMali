import type { Metadata } from 'next'
import { Poppins, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Akiba · Know your money',
  description: 'Personal finance app for Kenyan students',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${poppins.variable} ${ibmPlexMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
