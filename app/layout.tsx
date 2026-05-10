import type { Metadata } from 'next'
import { Indie_Flower, Satisfy, Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import './globals.css'
import '@maptiler/sdk/style.css'

const indieFlower = Indie_Flower({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-handwritten'
});

const satisfy = Satisfy({ 
  subsets: ["latin"],
  weight: "400",
  variable: '--font-cursive'
});

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'Wanderlist — travel lists & itineraries',
  description: 'Build city lists, save places, and plan trips in a scrapbook-style planner',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${indieFlower.variable} ${satisfy.variable} ${nunito.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
