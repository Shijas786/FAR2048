'use client'

/**
 * Create Match Modal with Free Play and Room Code
 * 
 * Allows host to create matches with:
 * - Free play mode (no wager)
 * - Custom wager amounts
 * - Shows room code after creation
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createMatch } from '@/lib/api'
import { usePrivy } from '@privy-io/react-auth'
import { useGameStore } from '@/lib/store'

interface Props {
  chain: 'base' | 'arbitrum'
  onClose: () => void
  onSuccess: () => void
}

export function CreateMatchModal({ chain, onClose, onSuccess }: Props) {
  const [wagerAmount, setWagerAmount] = useState('10')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [isCreating, setIsCreating] = useState(false)
  const [isFreePlay, setIsFreePlay] = useState(true) // Default to free play
  const [createdMatch, setCreatedMatch] = useState<any>(null)
  
  // Make Privy optional
  let privyData = { ready: true, authenticated: false, login: () => {} }
  try {
    privyData = usePrivy()
  } catch (e) {
    // Privy not configured
  }
  const { ready, authenticated, login } = privyData
  const { user } = useGameStore()

  const contractAddress =
    chain === 'base'
      ? process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
      : process.env.NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

  async function handleCreate() {
    if (!ready || !authenticated) {
      login()
      return
    }

    const wager = isFreePlay ? 0 : parseFloat(wagerAmount)
    if (isNaN(wager) || wager < 0) {
      alert('Please enter a valid wager amount')
      return
    }

    setIsCreating(true)

    try {
      const result = await createMatch({
        chain,
        wagerAmount: wager,
        maxPlayers,
        contractAddress,
        userData: {
          username: user?.username,
          displayName: user?.displayName,
          pfpUrl: user?.pfpUrl,
          walletAddress: user?.walletAddress,
        },
      })

      setCreatedMatch(result)
      // Don't close immediately - show room code first
    } catch (error: any) {
      console.error('Failed to create match:', error)
      alert(error.message || 'Failed to create match')
      setIsCreating(false)
    }
  }

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  const copyRoomCode = () => {
    if (createdMatch?.room_code) {
      navigator.clipboard.writeText(createdMatch.room_code)
      alert('Room code copied!')
    }
  }

  // Show room code after successful creation
  if (createdMatch) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-6 rounded-2xl max-w-md w-full"
          >
            {/* Success Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Room Created!</h2>
              <p className="text-gray-400 text-sm">
                Share this code with your friends
              </p>
            </div>

            {/* Room Code Display */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                Room Code
              </label>
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-xl p-6">
                <div className="text-5xl font-bold text-center tracking-wider text-white font-mono">
                  {createdMatch.room_code?.slice(0, 3)}
                  <span className="text-blue-400">-</span>
                  {createdMatch.room_code?.slice(3)}
                </div>
                <button
                  onClick={copyRoomCode}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Code
                </button>
              </div>
            </div>

            {/* Match Details */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Type:</span>
                <span className="text-white font-medium">
                  {createdMatch.wager_amount === 0 ? '🎮 Free Play' : '💰 Wager Match'}
                </span>
              </div>
              {createdMatch.wager_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Wager:</span>
                  <span className="text-white font-medium">{createdMatch.wager_amount} USDC</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Players:</span>
                <span className="text-white font-medium">{createdMatch.current_players} / {createdMatch.max_players}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Chain:</span>
                <span className="text-white font-medium capitalize">{chain}</span>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                💡 Players need to enter this code to join your room. 
                {createdMatch.wager_amount > 0 && ' They must approve the wager before the game starts.'}
              </p>
            </div>

            {/* Actions */}
            <button
              onClick={handleDone}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    )
  }

  // Create Match Form
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass p-6 rounded-2xl max-w-sm w-full"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Create Room</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Create a new game room and invite friends
          </p>

          {/* Free Play Toggle */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-white">Free Play Mode</div>
                <div className="text-sm text-gray-400">Play for fun, no wager required</div>
              </div>
              <button
                type="button"
                onClick={() => setIsFreePlay(!isFreePlay)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isFreePlay ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isFreePlay ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Wager Input - Only show if not free play */}
          {!isFreePlay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <label className="block text-sm font-semibold mb-2">
                Wager Amount (USDC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">USDC</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                All players must approve this amount
              </p>
            </motion.div>
          )}

          {/* Max Players */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">
              Max Players: {maxPlayers}
            </label>
            <div className="flex gap-2">
              {[2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    maxPlayers === num
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Chain Badge */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="text-gray-400">Chain:</span>
            <span className={`px-3 py-1 rounded-full font-medium ${
              chain === 'base' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-teal-500/20 text-teal-400'
            }`}>
              {chain === 'base' ? '🔵 Base' : '🔷 Arbitrum'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Room
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

