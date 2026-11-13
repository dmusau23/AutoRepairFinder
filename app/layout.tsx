import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Auto Repair Finder | Compare trusted repair quotes',
  description: 'Find trusted local repair shops, compare clear quotes, and choose what works for you.',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#f5f7f4',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-[#f5f7f4]">
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
