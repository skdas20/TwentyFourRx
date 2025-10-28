import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Splash from '@/components/ui/Splash'

export const metadata: Metadata = {
  title: '24Rx - B2B Medicine Trading Platform',
  description: 'List, buy, or hold inventory with admin-approved pricing and 10-day auto-delivery for holds.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Splash />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
