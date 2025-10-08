'use client'

/**
 * Global Providers
 * Wraps app with necessary context providers
 */

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { base, arbitrum } from 'viem/chains'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  // Make Privy optional for local development
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  
  return (
    <QueryClientProvider client={queryClient}>
      {privyAppId ? (
        <PrivyProvider
          appId={privyAppId}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#0052FF',
            },
            embeddedWallets: {
              createOnLogin: 'all-users',
            },
            supportedChains: [base, arbitrum],
            defaultChain: base,
          }}
        >
          {children}
        </PrivyProvider>
      ) : (
        // Run without Privy for local dev
        <>{children}</>
      )}
    </QueryClientProvider>
  )
}

