import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FAR2048 - Multiplayer 2048 Battle',
  description: '4-player real-time 2048 battle game with USDC betting on Base and Arbitrum',
  
  // OpenGraph for social sharing
  openGraph: {
    title: 'FAR2048 - Multiplayer 2048 Battle',
    description: 'Battle up to 4 players in real-time 2048. Bet USDC, winner takes all!',
    url: 'https://far2048.vercel.app',
    siteName: 'FAR2048',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'FAR2048 - Multiplayer 2048 Battle',
    description: 'Battle up to 4 players in real-time 2048. Bet USDC, winner takes all!',
    images: ['/og-image.png'],
  },

  // Farcaster Mini App metadata
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://far2048.vercel.app/embed-image.png',
      button: {
        title: 'FAR2048',
        action: {
          type: 'launch',
          url: 'https://far2048.vercel.app',
        },
      },
    }),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Farcaster preconnect for Quick Auth */}
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

