'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { joinMatchByCode } from '@/lib/api'
import { useGameStore } from '@/lib/store'

interface Props {
  onClose: () => void
  onSuccess: (match: any) => void
}

export function JoinByCodeModal({ onClose, onSuccess }: Props) {
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const { user } = useGameStore()

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    if (roomCode.length !== 6) {
      setError('Room code must be 6 characters')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const result = await joinMatchByCode({
        roomCode: roomCode.toUpperCase(),
        walletAddress: user?.walletAddress || '0x0000000000000000000000000000000000000000',
        userData: {
          username: user?.username,
          displayName: user?.displayName,
          pfpUrl: user?.pfpUrl,
          walletAddress: user?.walletAddress,
        },
      })

      onSuccess(result.match)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  const formatRoomCode = (value: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    // Limit to 6 characters
    return cleaned.slice(0, 6)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value)
    setRoomCode(formatted)
    setError('') // Clear error on input
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Join Room</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Instructions */}
          <p className="text-gray-400 text-sm mb-6">
            Enter the 6-character room code to join a match. Get the code from the host.
          </p>

          {/* Room Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={handleInputChange}
              placeholder="ABC123"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              maxLength={6}
              autoFocus
              disabled={isJoining}
            />
            {roomCode.length === 6 && (
              <div className="mt-2 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-400 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Valid code format
                </motion.div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isJoining}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isJoining || roomCode.length !== 6}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining...
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
          </div>

          {/* Helpful Tip */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-blue-300 text-sm">
                <p className="font-medium mb-1">💡 Tip:</p>
                <p className="text-blue-400/80">Room codes are case-insensitive. Just enter the 6 characters shown by the host.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

