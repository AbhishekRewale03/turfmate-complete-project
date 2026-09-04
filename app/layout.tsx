import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'TurfMate', template: '%s · TurfMate' },
  description: 'Book and manage turf time without the back-and-forth.',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', colorScheme: 'light', themeColor: '#173f31' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={GeistSans.variable}><body>{children}</body></html>
}
