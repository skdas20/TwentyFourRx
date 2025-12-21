import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Providers } from '@/app/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '24Rx Exchange - World\'s Only Med-Trade Platform',
  description: 'Find all the rare and high demand medicines at the rate you never thought of. India\'s premier B2B pharmaceutical trading platform connecting verified sellers and traders.',
  keywords: 'medicine trading, pharmaceutical B2B, medicine exchange, drug trading platform, pharmaceutical marketplace, medicine suppliers India, bulk medicine purchase, pharmaceutical trading platform',
  authors: [{ name: '24Rx Exchange Team' }],
  creator: '24Rx Exchange',
  publisher: '24Rx Exchange',
  metadataBase: new URL('https://24rxexchange.com'),
  alternates: {
    canonical: 'https://24rxexchange.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://24rxexchange.com',
    title: '24Rx Exchange - World\'s Only Med-Trade Platform',
    description: 'Find all the rare and high demand medicines at the rate you never thought of. India\'s premier B2B pharmaceutical trading platform.',
    siteName: '24Rx Exchange',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '24Rx Exchange - Medicine Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '24Rx Exchange - World\'s Only Med-Trade Platform',
    description: 'Find all the rare and high demand medicines at the rate you never thought of.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3B82F6" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
