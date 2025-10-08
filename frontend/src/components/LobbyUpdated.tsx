'use client'

/**
 * Updated Lobby Component with Room Codes
 * 
 * Features:
 * - Join by room code
 * - Shows room codes for each match
 * - Free play indication
 * - Better match cards
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getMatches, getRecentWinners } from '@/lib/api'
import { useGameStore } from '@/lib/store'
import { MatchCard } from './MatchCard'
import { CreateMatchModal } from './CreateMatchModal'
import { JoinByCodeModal } from './JoinByCodeModal'

export function Lobby() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedChain, setSelectedChain] = useState<'base' | 'arbitrum'>('base')
  const { user } = useGameStore()

  // Fetch matches
  const { data: matchesData, refetch: refetchMatches } = useQuery({
    queryKey: ['matches', selectedChain],
    queryFn: () => getMatches({ chain: selectedChain, status: 'open' }),
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // Fetch recent winners
  const { data: winnersData } = useQuery({
    queryKey: ['recent-winners'],
    queryFn: () => getRecentWinners(5),
    refetchInterval: 10000,
  })

  const matches = matchesData?.matches || []
  const recentWinners = winnersData?.recentWinners || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            FAR2048
          </h1>
          <p className="text-gray-400 text-lg">
            4-Player Real-Time 2048 Battle
          </p>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Room
          </button>
          
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex-1 py-4 px-6 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border-2 border-gray-700 hover:border-gray-600 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Join with Code
          </button>
        </div>

        {/* Chain Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex glass rounded-xl p-1">
            <button
              onClick={() => setSelectedChain('base')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedChain === 'base'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔵 Base
            </button>
            <button
              onClick={() => setSelectedChain('arbitrum')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedChain === 'arbitrum'
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔷 Arbitrum
            </button>
          </div>
        </div>

        {/* Matches Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded"></span>
            Open Rooms
            <span className="ml-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
              {matches.length}
            </span>
          </h2>

          {matches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-12 rounded-2xl text-center"
            >
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-gray-400 mb-2">No open rooms</p>
              <p className="text-gray-500 mb-6">Be the first to create a match!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Create Room
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match: any, index: number) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MatchCard match={match} onRefresh={refetchMatches} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Winners */}
        {recentWinners.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-yellow-500 rounded"></span>
              Recent Winners
            </h2>
            <div className="glass rounded-2xl p-6">
              <div className="space-y-3">
                {recentWinners.slice(0, 5).map((winner: any, index: number) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <div className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏆'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {winner.winner?.display_name || winner.winner?.username || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Highest tile: {winner.winner_highest_tile || 'N/A'}
                      </p>
                    </div>
                    {winner.payout_amount > 0 && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          +{winner.payout_amount} USDC
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateMatchModal
          chain={selectedChain}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetchMatches()
          }}
        />
      )}

      {showJoinModal && (
        <JoinByCodeModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={(match) => {
            // Navigate to match or show success
            refetchMatches()
          }}
        />
      )}
    </div>
  )
}

