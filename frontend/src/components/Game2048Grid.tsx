'use client'

/**
 * 2048 Game Grid Component
 * 
 * Renders the playable 4x4 grid with tiles
 * Includes touch/swipe controls
 */

import { motion } from 'framer-motion'
import { GameState, Direction } from '@/lib/game2048'
import { useState, useRef, useEffect } from 'react'

interface Props {
  gameState: GameState
  onMove: (direction: Direction) => void
  size?: 'small' | 'large'
}

export function Game2048Grid({ gameState, onMove, size = 'large' }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)

  const gridSize = size === 'large' ? 'w-full aspect-square' : 'w-32 h-32'
  const tileSize = size === 'large' ? 'text-3xl' : 'text-xs'

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const minSwipeDistance = 30

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        onMove(deltaX > 0 ? 'right' : 'left')
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        onMove(deltaY > 0 ? 'down' : 'up')
      }
    }

    setTouchStart(null)
  }

  return (
    <div
      ref={gridRef}
      className={`${gridSize} bg-gray-800/50 rounded-2xl p-2 relative select-none`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid background */}
      <div className="absolute inset-2 grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="bg-gray-700/30 rounded-lg" />
        ))}
      </div>

      {/* Tiles */}
      <div className="relative grid grid-cols-4 gap-2 h-full">
        {gameState.grid.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <Tile
              key={`${rowIndex}-${colIndex}`}
              value={value}
              size={tileSize}
            />
          ))
        )}
      </div>
    </div>
  )
}

function Tile({ value, size }: { value: number; size: string }) {
  const getTileColor = (val: number): string => {
    const colors: Record<number, string> = {
      0: 'bg-transparent',
      2: 'bg-[#EEE4DA] text-gray-800',
      4: 'bg-[#EDE0C8] text-gray-800',
      8: 'bg-[#F2B179] text-white',
      16: 'bg-[#F59563] text-white',
      32: 'bg-[#F67C5F] text-white',
      64: 'bg-[#F65E3B] text-white',
      128: 'bg-[#EDCF72] text-white',
      256: 'bg-[#EDCC61] text-white',
      512: 'bg-[#EDC850] text-white',
      1024: 'bg-[#EDC53F] text-white',
      2048: 'bg-[#EDC22E] text-white shadow-glow-tile',
      4096: 'bg-[#3C3A32] text-white',
    }
    return colors[val] || colors[4096]
  }

  if (value === 0) return <div />

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`${getTileColor(value)} rounded-lg flex items-center justify-center font-bold ${size} shadow-lg`}
    >
      {value}
    </motion.div>
  )
}

