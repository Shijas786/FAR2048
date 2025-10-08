'use client'

/**
 * Results Component
 * 
 * Shows match results after completion:
 * - Winner announcement
 * - Final scores and rankings
 * - Claim winnings button (for winner)
 * - Match summary
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store'

export function Results() {
  const {
    activeMatch,
    players,
    user,
    setCurrentView,
    reset,
  } = useGameStore()

  useEffect(() => {
    // Clean up socket listeners when leaving results
    return () => {
      // Could disconnect socket here if needed
    }
  }, [])

  if (!activeMatch) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-gray-400">No match data</p>
          <button
            onClick={() => setCurrentView('lobby')}
            className="btn-primary mt-4"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  const winner = players.find((p) => p.fid === activeMatch.winnerFid)
  const isWinner = user?.fid === activeMatch.winnerFid

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.highestTile !== a.highestTile) return b.highestTile - a.highestTile
    return b.score - a.score
  })

  const handleBackToLobby = () => {
    reset()
    setCurrentView('lobby')
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Winner Announcement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`glass p-8 rounded-2xl text-center mb-6 ${
            isWinner ? 'ring-4 ring-yellow-400 shadow-glow-tile' : ''
          }`}
        >
          {isWinner ? (
            <>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-6xl mb-4"
              >
                🏆
              </motion.div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                You Won!
              </h1>
              <p className="text-2xl font-bold text-green-400 mb-4">
                +{activeMatch.totalPot * 0.99} USDC
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">🥈</div>
              <h2 className="text-2xl font-bold mb-2">Match Ended</h2>
              <p className="text-gray-400 mb-2">Winner:</p>
              <p className="text-xl font-bold">
                @{winner?.username || `FID ${winner?.fid}`}
              </p>
            </>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl mb-6"
        >
          <h3 className="text-xl font-bold mb-4">Final Standings</h3>
          <div className="space-y-3">
            {sortedPlayers.map((player, idx) => {
              const isCurrentUser = player.fid === user?.fid
              const position = idx + 1
              const medal = ['🥇', '🥈', '🥉', ''][idx] || ''

              return (
                <motion.div
                  key={player.fid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentUser ? 'bg-base-500/20 ring-1 ring-base-500' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{medal || `#${position}`}</span>
                    <div className="w-10 h-10 bg-gradient-to-br from-base-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
                      {player.username?.[0] || player.fid.toString()[0]}
                    </div>
                    <div>
                      <p className="font-semibold">
                        @{player.username || `FID ${player.fid}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {player.movesCount} moves
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-400">
                      {player.highestTile}
                    </p>
                    <p className="text-sm text-gray-400">{player.score} pts</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Match Summary */}
        {activeMatch.match_summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="glass p-4 rounded-xl mb-6"
          >
            <p className="text-sm text-gray-300 italic">
              "{activeMatch.match_summary}"
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          {isWinner && (
            <button className="w-full btn-primary py-4 text-lg bg-gradient-to-r from-green-500 to-emerald-600">
              💰 Claim {(activeMatch.totalPot * 0.99).toFixed(2)} USDC
            </button>
          )}
          
          <button
            onClick={handleBackToLobby}
            className="w-full btn-secondary py-3"
          >
            Back to Lobby
          </button>
        </motion.div>
      </div>
    </div>
  )
}

