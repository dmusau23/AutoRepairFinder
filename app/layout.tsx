import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Auto Repair Finder | Compare trusted repair quotes',
  description: 'Compare transparent auto repair quotes from trusted local shops.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#f7f7f4',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-[#f7f7f4]">
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
