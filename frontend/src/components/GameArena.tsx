'use client'

/**
 * Game Arena Component
 * 
 * Main gameplay screen showing:
 * - 4 player grids (mini view)
 * - Current player's grid (large)
 * - Scores and timers
 * - Live updates via Socket.IO
 */

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { createNewGame, makeMove, Direction, GameState } from '@/lib/game2048'
import { Game2048Grid } from './Game2048Grid'
import { MiniPlayerGrid } from './MiniPlayerGrid'
import {
  initializeSocket,
  setupMatchListeners,
  joinMatchRoom,
  setPlayerReady,
  sendGameMove,
} from '@/lib/socket'

export function GameArena() {
  const {
    activeMatch,
    players,
    user,
    gameState,
    setGameState,
    remainingTime,
    setRemainingTime,
    setCurrentView,
  } = useGameStore()

  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  // Initialize socket connection
  useEffect(() => {
    const socket = initializeSocket()
    setupMatchListeners()

    if (activeMatch?.id) {
      console.log('Joining match room:', activeMatch.id)
      joinMatchRoom(activeMatch.id)
    }

    return () => {
      // Don't leave room on unmount in case of re-render
    }
  }, [activeMatch?.id]) // Only rejoin if match ID changes, not the whole object

  // Initialize game when match starts
  useEffect(() => {
    console.log('Game init check:', {
      status: activeMatch?.status,
      hasGameState: !!gameState,
      gameStarted
    })
    
    // Clear game state when in waiting room
    if (activeMatch?.status === 'open' || activeMatch?.status === 'starting') {
      if (gameState || gameStarted) {
        console.log('🧹 Clearing game state for new match')
        setGameState(null)
        setGameStarted(false)
      }
    }
    
    // Initialize game when match starts
    if (activeMatch?.status === 'in_progress') {
      if (!gameState) {
        console.log('🎮 Initializing new game!')
        const newGame = createNewGame()
        setGameState(newGame)
      }
      
      if (!gameStarted) {
        console.log('🎮 Setting gameStarted = true')
        setGameStarted(true)
      }
    }
  }, [activeMatch?.status, gameState, gameStarted, setGameState])

  // Countdown timer
  useEffect(() => {
    if (!gameStarted || activeMatch?.status !== 'in_progress') return

    const interval = setInterval(() => {
      const currentTime = useGameStore.getState().remainingTime
      if (currentTime <= 1) {
        clearInterval(interval)
        console.log('⏰ Time up! Match ended')
        // Trigger game over
        setCurrentView('results')
        setRemainingTime(0)
      } else {
        setRemainingTime(currentTime - 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStarted, activeMatch?.status, setRemainingTime, setCurrentView])

  // Handle ready toggle
  const handleReadyToggle = useCallback(() => {
    if (!activeMatch || !user) return

    const newReadyState = !isReady
    setIsReady(newReadyState)
    console.log('Ready toggle:', newReadyState, 'for match:', activeMatch.id, 'FID:', user.fid)
    setPlayerReady(activeMatch.id, user.fid, newReadyState)
  }, [activeMatch, user, isReady])

  // Handle game moves
  const handleMove = useCallback(
    (direction: Direction) => {
      console.log('🎮 Move attempted:', direction, {
        hasGameState: !!gameState,
        hasActiveMatch: !!activeMatch,
        userFid: user?.fid
      })
      
      if (!gameState || !activeMatch || !user) {
        console.log('❌ Move blocked - missing gameState, activeMatch, or user')
        return
      }

      const newState = makeMove(gameState, direction)
      if (!newState) {
        console.log('❌ Invalid move - makeMove returned null')
        return // Invalid move
      }

      console.log('✅ Move successful! New score:', newState.score, 'FID:', user.fid)
      setGameState(newState)

      // Check for game over (no more valid moves)
      if (newState.isGameOver) {
        console.log('💀 Game Over! No more valid moves')
        setTimeout(() => {
          setCurrentView('results')
        }, 1500) // Small delay so player can see final state
      }

      // Send move to backend
      sendGameMove(
        activeMatch.id,
        user.fid,
        direction,
        newState.grid,
        newState.score,
        newState.highestTile,
        newState.movesCount
      )
    },
    [gameState, activeMatch, user, setGameState, setCurrentView]
  )

  // Keyboard controls
  useEffect(() => {
    console.log('⌨️ Keyboard listener setup. gameStarted:', gameStarted)
    
    if (!gameStarted) {
      console.log('⌨️ Keyboard disabled - game not started')
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('⌨️ Key pressed:', e.key)
      
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }

      const direction = keyMap[e.key]
      if (direction) {
        console.log('⌨️ Valid direction key:', direction)
        e.preventDefault()
        handleMove(direction)
      }
    }

    console.log('✅ Keyboard listener active')
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      console.log('🛑 Keyboard listener removed')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameStarted, handleMove])

  if (!activeMatch) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-gray-400">No active match</p>
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

  // Waiting room (before match starts)
  if (activeMatch.status === 'open' || activeMatch.status === 'starting') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="glass p-4 rounded-xl mb-4">
            <h2 className="text-xl font-bold mb-2">Waiting Room</h2>
            <p className="text-sm text-gray-400">
              Match #{activeMatch.matchNumber || activeMatch.id.slice(0, 6)}
            </p>
          </div>

          {/* Players */}
          <div className="glass p-6 rounded-xl mb-4">
            <h3 className="font-semibold mb-4">
              Players ({players.length}/{activeMatch.maxPlayers})
            </h3>
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.fid}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-base-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
                      {player.username?.[0] || player.fid.toString()[0]}
                    </div>
                    <div>
                      <p className="font-semibold">
                        @{player.username || `FID ${player.fid}`}
                      </p>
                      <p className="text-xs text-gray-500">Player {player.joinOrder}</p>
                    </div>
                  </div>
                  {player.isReady && (
                    <span className="text-green-400 text-sm">✓ Ready</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ready Button */}
          <button
            onClick={handleReadyToggle}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isReady
                ? 'bg-green-500 hover:bg-green-600'
                : 'btn-primary'
            }`}
          >
            {isReady ? '✓ Ready!' : 'Ready Up'}
          </button>

          {activeMatch.status === 'starting' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-green-400 font-bold mt-4 text-xl"
            >
              Starting soon...
            </motion.p>
          )}
        </div>
      </div>
    )
  }

  // Active game
  return (
    <div className="min-h-screen p-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="glass px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-400">Time</p>
          <p className="text-2xl font-bold">
            {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
          </p>
        </div>

        <div className="glass px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-400">Your Score</p>
          <p className="text-2xl font-bold text-green-400">
            {gameState?.score || 0}
          </p>
        </div>

        <div className="glass px-4 py-2 rounded-lg">
          <p className="text-sm text-gray-400">Best Tile</p>
          <p className="text-2xl font-bold text-yellow-400">
            {gameState?.highestTile || 0}
          </p>
        </div>
      </div>

      {/* Mini Player Grids */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {players.slice(0, 4).map((player) => {
          // For current user, update their player data with current game state
          const isCurrentUser = player.fid === user?.fid
          const playerData = isCurrentUser && gameState
            ? {
                ...player,
                score: gameState.score,
                highestTile: gameState.highestTile,
                movesCount: gameState.movesCount,
                liveGrid: gameState.grid,
              }
            : player

          return (
            <MiniPlayerGrid
              key={player.fid}
              player={playerData}
              isCurrentUser={isCurrentUser}
            />
          )
        })}
      </div>

      {/* Main Game Grid */}
      {gameState && (
        <div className="mb-4 relative">
          <Game2048Grid
            gameState={gameState}
            onMove={handleMove}
          />
          
          {/* Game Over Overlay */}
          {gameState.isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center"
            >
              <div className="text-center">
                <h2 className="text-4xl font-bold text-red-500 mb-2">Game Over!</h2>
                <p className="text-gray-300 text-lg">No more valid moves</p>
                <p className="text-gray-400 text-sm mt-2">Redirecting to results...</p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Controls hint */}
      <div className="glass p-3 rounded-lg text-center text-sm text-gray-400">
        <p>Use arrow keys or swipe to play</p>
      </div>
    </div>
  )
}

