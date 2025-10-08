'use client'

/**
 * Match Card Component with Room Code
 * 
 * Displays match info including:
 * - Room code
 * - Free play indication
 * - Player count
 * - Copy room code feature
 */

import { motion } from 'framer-motion'
import { Match, useGameStore } from '@/lib/store'
import { joinMatch } from '@/lib/api'
import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface Props {
  match: any // Updated match type with room_code
  onRefresh: () => void
}

export function MatchCard({ match, onRefresh }: Props) {
  const [isJoining, setIsJoining] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const { user, setActiveMatch, setCurrentView } = useGameStore()
  
  // Make Privy optional
  let privyData = { ready: true, authenticated: false, login: () => {} }
  try {
    privyData = usePrivy()
  } catch (e) {
    // Privy not configured
  }
  const { ready, authenticated, login } = privyData

  const isFreePlay = match.wager_amount === 0
  const playersText = `${match.current_players}/${match.max_players}`
  const chainColor = match.chain === 'base' ? 'blue' : 'teal'

  const copyRoomCode = () => {
    if (match.room_code) {
      navigator.clipboard.writeText(match.room_code)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  async function handleJoin() {
    if (!ready || !authenticated) {
      login()
      return
    }

    setIsJoining(true)

    try {
      // Mock transaction for demo (in production, handle real blockchain tx)
      const mockTxHash = isFreePlay ? undefined : `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`

      await joinMatch({
        matchId: match.id,
        walletAddress: user?.walletAddress || '0x0000000000000000000000000000000000000000',
        txHash: mockTxHash as string,
        userData: {
          username: user?.username,
          displayName: user?.displayName,
          pfpUrl: user?.pfpUrl,
        },
      })

      // Update local state
      setActiveMatch(match)
      onRefresh()
      
      // Navigate to game view
      setCurrentView('game')
    } catch (error: any) {
      console.error('Failed to join match:', error)
      alert(error.message || 'Failed to join match')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`glass p-5 rounded-xl border-l-4 ${
        match.chain === 'base' ? 'border-blue-500' : 'border-teal-500'
      } hover:shadow-xl transition-shadow`}
    >
      {/* Header with Room Code */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Room Code - Prominent Display */}
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="text-lg font-mono font-bold text-white tracking-wider">
                {match.room_code?.slice(0, 3)}
                <span className={`text-${chainColor}-400`}>-</span>
                {match.room_code?.slice(3)}
              </span>
            </div>
            <button
              onClick={copyRoomCode}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors relative"
              title="Copy room code"
            >
              {showCopied ? (
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>

          {/* Match Type Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {isFreePlay ? (
              <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                🎮 Free Play
              </span>
            ) : (
              <>
                <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full">
                  💰 {match.wager_amount} USDC
                </span>
                {match.requires_approval && (
                  <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                    ⚠️ Approval Required
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chain Badge */}
        <span className={`px-3 py-1 ${
          match.chain === 'base' 
            ? 'bg-blue-500/20 text-blue-400' 
            : 'bg-teal-500/20 text-teal-400'
        } text-xs font-semibold rounded-lg`}>
          {match.chain === 'base' ? '🔵 Base' : '🔷 Arbitrum'}
        </span>
      </div>

      {/* Total Pot (only for paid matches) */}
      {!isFreePlay && match.total_pot > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Total Pot</p>
            <p className="text-2xl font-bold text-yellow-400">{match.total_pot} USDC</p>
          </div>
        </div>
      )}

      {/* Players */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Players</span>
          <span className="text-sm font-semibold text-white">{playersText}</span>
        </div>
        {/* Player slots visualization */}
        <div className="flex gap-1.5">
          {Array.from({ length: match.max_players }).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full transition-all ${
                idx < match.current_players
                  ? `bg-${chainColor}-500`
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Host Info (if available) */}
      {match.host && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span>Host: {match.host.display_name || match.host.username || 'Unknown'}</span>
        </div>
      )}

      {/* Join Button */}
      <button
        onClick={handleJoin}
        disabled={isJoining || match.current_players >= match.max_players}
        className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          match.current_players >= match.max_players
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : `bg-gradient-to-r from-${chainColor}-500 to-purple-500 hover:from-${chainColor}-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl`
        } disabled:opacity-50`}
      >
        {isJoining ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Joining...
          </>
        ) : match.current_players >= match.max_players ? (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Room Full
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Join Room
          </>
        )}
      </button>
    </motion.div>
  )
}

