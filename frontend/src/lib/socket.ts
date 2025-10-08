/**
 * Socket.IO Client
 * 
 * Manages real-time connection to backend for game state synchronization
 */

import { io, Socket } from 'socket.io-client'
import { useGameStore } from './store'

let socket: Socket | null = null

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Initialize Socket.IO connection
 */
export function initializeSocket(): Socket {
  if (socket) return socket

  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to server')
    useGameStore.getState().setIsConnected(true)
  })

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server')
    useGameStore.getState().setIsConnected(false)
  })

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error)
  })

  return socket
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Join a match room
 */
export function joinMatchRoom(matchId: string) {
  if (!socket) return
  socket.emit('join-match', matchId)
}

/**
 * Leave a match room
 */
export function leaveMatchRoom(matchId: string) {
  if (!socket) return
  socket.emit('leave-match', matchId)
}

/**
 * Set player ready status
 */
export function setPlayerReady(matchId: string, fid: number, isReady: boolean) {
  if (!socket) return
  socket.emit('player-ready', { matchId, fid, isReady })
}

/**
 * Send game move
 */
export function sendGameMove(
  matchId: string,
  fid: number,
  direction: string,
  gridState: number[][],
  score: number,
  highestTile: number,
  movesCount: number
) {
  if (!socket) return
  socket.emit('game-move', {
    matchId,
    fid,
    direction,
    gridState,
    score,
    highestTile,
    movesCount,
  })
}

/**
 * Spectate a match
 */
export function spectateMatch(matchId: string) {
  if (!socket) return
  socket.emit('spectate-match', matchId)
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Setup event listeners for match updates
 */
export function setupMatchListeners() {
  if (!socket) return

  const store = useGameStore.getState()

  // Match state update
  socket.on('match-state', (match) => {
    store.setActiveMatch(match)
    if (match.match_players) {
      store.setPlayers(match.match_players)
    }
  })

  // Player joined
  socket.on('player-joined', (data) => {
    console.log('Player joined event received:', data)
    store.updateMatch({
      currentPlayers: data.currentPlayers,
      totalPot: data.totalPot,
    })
    // Also add player to players list if provided
    if (data.player) {
      const currentPlayers = store.players
      const playerExists = currentPlayers.some(p => p.fid === data.player.fid)
      if (!playerExists) {
        store.setPlayers([...currentPlayers, {
          fid: data.player.fid,
          walletAddress: data.player.wallet_address,
          joinOrder: data.currentPlayers,
          isReady: false,
          score: 0,
          highestTile: 0,
          movesCount: 0,
        }])
      }
    }
  })

  // Player ready status updated
  socket.on('player-ready-update', (data) => {
    store.updatePlayer(data.fid, { isReady: data.isReady })
  })

  // Match starting countdown
  socket.on('match-starting', (data) => {
    console.log('🚀 Match starting countdown:', data)
    store.updateMatch({ status: 'starting' })
    // Could trigger countdown animation
  })

  // Match started
  socket.on('match-started', (data) => {
    console.log('🎮 MATCH STARTED! Data:', data)
    store.updateMatch({
      status: 'in_progress',
      startedAt: data.startTime,
    })
    store.setRemainingTime(120) // 2 minutes
    store.setCurrentView('game')
    console.log('🎮 Match status updated to in_progress, view set to game')
  })

  // Player made a move
  socket.on('player-move', (data) => {
    console.log('📡 Player move received:', {
      fid: data.fid,
      score: data.score,
      highestTile: data.highestTile,
      hasGridState: !!data.gridState,
      gridPreview: data.gridState ? data.gridState[0] : null
    })
    store.updatePlayer(data.fid, {
      score: data.score,
      highestTile: data.highestTile,
      movesCount: data.movesCount,
      liveGrid: data.gridState, // Add grid state!
    })
    console.log('📡 Player updated in store for FID:', data.fid)
  })

  // Player reached milestone
  socket.on('player-milestone', (data) => {
    // Could trigger celebration animation
    console.log(`🎉 Player ${data.fid} reached ${data.tile} tile!`)
  })

  // Match ended
  socket.on('match-ended', (data) => {
    console.log('🏁 Match ended! Winner:', data)
    store.updateMatch({
      status: 'ended',
      winnerFid: data.winnerFid,
    })
    store.setCurrentView('results')
  })

  // General match update
  socket.on('match-update', (data) => {
    store.updateMatch(data)
  })

  // Error
  socket.on('error', (data) => {
    console.error('Socket error:', data.message)
  })
}

/**
 * Remove all event listeners
 */
export function removeMatchListeners() {
  if (!socket) return

  socket.off('match-state')
  socket.off('player-joined')
  socket.off('player-ready-update')
  socket.off('match-starting')
  socket.off('match-started')
  socket.off('player-move')
  socket.off('player-milestone')
  socket.off('match-ended')
  socket.off('match-update')
  socket.off('error')
}

