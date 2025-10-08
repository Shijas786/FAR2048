/**
 * Global State Management with Zustand
 * 
 * Manages:
 * - Current view (lobby/game/results)
 * - Active match data
 * - User session
 * - Game state for current player
 */

import { create } from 'zustand'
import { GameState } from './game2048'

export type ViewType = 'lobby' | 'game' | 'results'

export interface User {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  walletAddress?: string
}

export interface Match {
  id: string
  matchNumber?: number
  chain: 'base' | 'arbitrum'
  wagerAmount: number
  maxPlayers: number
  currentPlayers: number
  totalPot: number
  status: 'open' | 'starting' | 'in_progress' | 'ended' | 'cancelled'
  hostFid: number
  winnerFid?: number
  createdAt: string
  startedAt?: string
  endedAt?: string
  players?: MatchPlayer[]
}

export interface MatchPlayer {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  walletAddress: string
  joinOrder: number
  isReady: boolean
  score: number
  highestTile: number
  movesCount: number
  liveGrid?: number[][]
}

interface GameStore {
  // View management
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // User session
  user: User | null
  setUser: (user: User | null) => void

  // Active match
  activeMatch: Match | null
  setActiveMatch: (match: Match | null) => void
  updateMatch: (updates: Partial<Match>) => void

  // Player data in match
  players: MatchPlayer[]
  setPlayers: (players: MatchPlayer[]) => void
  updatePlayer: (fid: number, updates: Partial<MatchPlayer>) => void

  // Current player's game state
  gameState: GameState | null
  setGameState: (state: GameState | null) => void

  // Match timer
  remainingTime: number
  setRemainingTime: (time: number) => void

  // Connection status
  isConnected: boolean
  setIsConnected: (connected: boolean) => void

  // Reset all state
  reset: () => void
}

const initialState = {
  currentView: 'lobby' as ViewType,
  user: null,
  activeMatch: null,
  players: [],
  gameState: null,
  remainingTime: 120,
  isConnected: false,
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setCurrentView: (view) => set({ currentView: view }),

  setUser: (user) => set({ user }),

  setActiveMatch: (match) => set({ activeMatch: match }),

  updateMatch: (updates) =>
    set((state) => ({
      activeMatch: state.activeMatch
        ? { ...state.activeMatch, ...updates }
        : null,
    })),

  setPlayers: (players) => set({ players }),

  updatePlayer: (fid, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.fid === fid ? { ...p, ...updates } : p
      ),
    })),

  setGameState: (gameState) => set({ gameState }),

  setRemainingTime: (time) => set({ remainingTime: time }),

  setIsConnected: (connected) => set({ isConnected: connected }),

  reset: () => set(initialState),
}))

