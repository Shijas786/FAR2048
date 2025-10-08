'use client'

/**
 * FAR2048 Main Page
 * Entry point for the Farcaster Mini App
 */

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { Lobby } from '@/components/Lobby'
import { GameArena } from '@/components/GameArena'
import { Results } from '@/components/Results'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useGameStore } from '@/lib/store'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentView, setCurrentView } = useGameStore()

  useEffect(() => {
    async function init() {
      try {
        // Initialize Farcaster Mini App SDK
        console.log('🎮 Initializing Farcaster Mini App...')
        
        // Get user context from Farcaster SDK
        const context = await sdk.context
        const { setUser } = useGameStore.getState()
        
        if (context?.user) {
          console.log('✅ Farcaster user authenticated:', context.user.fid)
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          })
        } else {
          console.error('❌ No Farcaster user context found')
          setError('Please open this app through Farcaster')
          setIsLoading(false)
          return
        }
        
        // Signal that app is ready to display
        await sdk.actions.ready()
        
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to initialize app:', err)
        setError('Failed to initialize Farcaster app. Please try again.')
        setIsLoading(false)
      }
    }

    init()
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass p-8 rounded-2xl max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="max-w-md mx-auto">
        {currentView === 'lobby' && <Lobby />}
        {currentView === 'game' && <GameArena />}
        {currentView === 'results' && <Results />}
      </div>
    </main>
  )
}

