/**
 * API Client
 * 
 * Handles HTTP requests to backend (Standalone version)
 */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

/**
 * Make authenticated API request
 * Uses simple authentication for standalone version
 */
async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get user ID from localStorage
  const userId = localStorage.getItem('far2048-user-id') || 'anonymous'
  
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId,
      ...options.headers,
    },
  })
}

/**
 * Make unauthenticated API request
 */
async function publicFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// ============================================
// MATCHES API
// ============================================

export async function getMatches(params?: {
  status?: string
  chain?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams(params as any).toString()
  const res = await publicFetch(`/api/matches?${query}`)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

export async function getMatch(matchId: string) {
  const res = await publicFetch(`/api/matches/${matchId}`)
  if (!res.ok) throw new Error('Failed to fetch match')
  return res.json()
}

export async function createMatch(data: {
  chain: 'base' | 'arbitrum'
  wagerAmount: number
  maxPlayers: number
  contractAddress: string
  contractMatchId?: number
  userData?: any
}) {
  const res = await authenticatedFetch('/api/matches/create', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create match')
  return res.json()
}

export async function joinMatch(data: {
  matchId: string
  walletAddress: string
  txHash: string
  userData?: any
}) {
  const res = await authenticatedFetch('/api/matches/join', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to join match')
  }
  return res.json()
}

export async function getMatchPlayers(matchId: string) {
  const res = await publicFetch(`/api/matches/${matchId}/players`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}

/**
 * Join a match by room code
 */
export async function joinMatchByCode(data: {
  roomCode: string
  walletAddress: string
  userData?: any
}) {
  const res = await authenticatedFetch('/api/matches/join-by-code', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to join match' }))
    throw new Error(error.error || 'Failed to join match')
  }
  return res.json()
}

/**
 * Approve a match wager
 */
export async function approveMatch(matchId: string) {
  const res = await authenticatedFetch(`/api/matches/${matchId}/approve`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to approve match')
  return res.json()
}

// ============================================
// USERS API
// ============================================

export async function getUser(fid: number) {
  const res = await publicFetch(`/api/users/${fid}`)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function getUserMatches(fid: number, params?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams(params as any).toString()
  const res = await publicFetch(`/api/users/${fid}/matches?${query}`)
  if (!res.ok) throw new Error('Failed to fetch user matches')
  return res.json()
}

export async function getUserStats(fid: number) {
  const res = await publicFetch(`/api/users/${fid}/stats`)
  if (!res.ok) throw new Error('Failed to fetch user stats')
  return res.json()
}

export async function updateProfile(data: {
  username?: string
  displayName?: string
  pfpUrl?: string
  walletAddress?: string
}) {
  const res = await authenticatedFetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}

// ============================================
// LEADERBOARD API
// ============================================

export async function getLeaderboard(params?: {
  sortBy?: string
  limit?: number
  offset?: number
}) {
  const query = new URLSearchParams(params as any).toString()
  const res = await publicFetch(`/api/leaderboard?${query}`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function getUserRank(fid: number) {
  const res = await publicFetch(`/api/leaderboard/rank/${fid}`)
  if (!res.ok) throw new Error('Failed to fetch user rank')
  return res.json()
}

export async function getRecentWinners(limit = 10) {
  const res = await publicFetch(`/api/leaderboard/recent-winners?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch recent winners')
  return res.json()
}

// ============================================
// HEALTH CHECK
// ============================================

export async function healthCheck() {
  const res = await publicFetch('/health')
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

