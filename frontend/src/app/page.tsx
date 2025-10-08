'use client'

/**
 * FAR2048 Main Page
 * Standalone version without Farcaster (for testing)
 */

import { useEffect, useState } from 'react'
import { Lobby } from '@/components/Lobby'
import { GameArena } from '@/components/GameArena'
import { Results } from '@/components/Results'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useGameStore } from '@/lib/store'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const { currentView } = useGameStore()

  useEffect(() => {
    async function init() {
      try {
        console.log('🎮 Initializing FAR2048...')
        
        const { setUser } = useGameStore.getState()
        
        // Generate or retrieve user ID from localStorage
        let userId = localStorage.getItem('far2048-user-id')
        if (!userId) {
          userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('far2048-user-id', userId)
        }
        
        // Set anonymous user
        const randomFid = parseInt(userId.split('-')[1]) % 1000000
        setUser({
          fid: randomFid,
          username: `Player${randomFid.toString().slice(-4)}`,
          displayName: `Player ${randomFid.toString().slice(-4)}`,
        })
        
        console.log('✅ User initialized:', randomFid)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to initialize app:', err)
        setIsLoading(false)
      }
    }

    init()
  }, [])

  if (isLoading) {
    return <LoadingScreen />
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

