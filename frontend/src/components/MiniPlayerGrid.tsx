'use client'

/**
 * Mini Player Grid Component
 * 
 * Shows a small version of each player's grid in multiplayer view
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MatchPlayer } from '@/lib/store'

interface Props {
  player: MatchPlayer
  isCurrentUser: boolean
}

// Helper to create empty grid
const createEmptyGrid = () => {
  return Array(4).fill(null).map(() => Array(4).fill(0))
}

export function MiniPlayerGrid({ player, isCurrentUser }: Props) {
  // Debug logging
  useEffect(() => {
    if (!isCurrentUser) {
      console.log(`🎮 MiniPlayerGrid for player ${player.fid}:`, {
        hasLiveGrid: !!player.liveGrid,
        score: player.score,
        highestTile: player.highestTile,
        gridPreview: player.liveGrid ? player.liveGrid[0] : 'no grid'
      })
    }
  }, [player.liveGrid, player.score, player.fid, isCurrentUser])

  // Get the grid to display
  const displayGrid = player.liveGrid || createEmptyGrid()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass p-2 rounded-lg ${
        isCurrentUser ? 'ring-2 ring-base-500' : ''
      }`}
    >
      {/* Player info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-base-500 to-purple-600 rounded text-xs flex items-center justify-center font-bold">
            {player.username?.[0] || player.fid.toString()[0]}
          </div>
          <div>
            <p className="text-xs font-semibold truncate max-w-[80px]">
              @{player.username || `FID ${player.fid}`}
            </p>
          </div>
        </div>
        {isCurrentUser && (
          <span className="text-xs text-base-400 font-bold">YOU</span>
        )}
      </div>

      {/* Mini grid */}
      <div className="bg-gray-800/50 rounded-lg p-1 mb-2">
        <div className="grid grid-cols-4 gap-0.5">
          {displayGrid.flat().map((value, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm flex items-center justify-center text-[6px] font-bold ${
                value === 0 ? 'bg-gray-700/30' : 'bg-yellow-500/80 text-gray-900'
              }`}
            >
              {value > 0 && value}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Score: <span className="text-white font-semibold">{player.score || 0}</span></span>
        <span>Tile: <span className="text-yellow-400 font-semibold">{player.highestTile || 0}</span></span>
      </div>
    </motion.div>
  )
}

