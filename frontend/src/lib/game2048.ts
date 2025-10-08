/**
 * 2048 Game Logic
 * 
 * Core game engine for 2048 mechanics:
 * - Grid initialization
 * - Move logic (up, down, left, right)
 * - Tile merging
 * - Score calculation
 * - Win/lose detection
 */

export type Direction = 'up' | 'down' | 'left' | 'right'
export type Grid = number[][]

export interface GameState {
  grid: Grid
  score: number
  highestTile: number
  movesCount: number
  isGameOver: boolean
  hasWon: boolean
}

/**
 * Initialize empty 4x4 grid
 */
export function initializeGrid(): Grid {
  return Array(4)
    .fill(null)
    .map(() => Array(4).fill(0))
}

/**
 * Create new game state with 2 initial tiles
 */
export function createNewGame(): GameState {
  const grid = initializeGrid()
  addRandomTile(grid)
  addRandomTile(grid)

  return {
    grid,
    score: 0,
    highestTile: 2,
    movesCount: 0,
    isGameOver: false,
    hasWon: false,
  }
}

/**
 * Add a random tile (90% chance 2, 10% chance 4) to empty cell
 */
export function addRandomTile(grid: Grid): boolean {
  const emptyCells: [number, number][] = []

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === 0) {
        emptyCells.push([row, col])
      }
    }
  }

  if (emptyCells.length === 0) return false

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  grid[row][col] = Math.random() < 0.9 ? 2 : 4

  return true
}

/**
 * Deep clone grid
 */
function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

/**
 * Check if two grids are equal
 */
function gridsEqual(grid1: Grid, grid2: Grid): boolean {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid1[row][col] !== grid2[row][col]) return false
    }
  }
  return true
}

/**
 * Rotate grid 90 degrees clockwise
 */
function rotateGrid(grid: Grid): Grid {
  const newGrid = initializeGrid()
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      newGrid[col][3 - row] = grid[row][col]
    }
  }
  return newGrid
}

/**
 * Rotate grid 90 degrees counter-clockwise
 */
function rotateGridCCW(grid: Grid): Grid {
  const newGrid = initializeGrid()
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      newGrid[3 - col][row] = grid[row][col]
    }
  }
  return newGrid
}

/**
 * Move and merge tiles in one direction (left)
 * Returns [new grid, points gained, any change occurred]
 */
function moveLeft(grid: Grid): [Grid, number] {
  const newGrid = cloneGrid(grid)
  let pointsGained = 0

  for (let row = 0; row < 4; row++) {
    // Collect non-zero tiles
    const tiles: number[] = []
    for (let col = 0; col < 4; col++) {
      if (newGrid[row][col] !== 0) {
        tiles.push(newGrid[row][col])
      }
    }

    // Merge adjacent equal tiles
    const merged: number[] = []
    let i = 0
    while (i < tiles.length) {
      if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
        const mergedValue = tiles[i] * 2
        merged.push(mergedValue)
        pointsGained += mergedValue
        i += 2
      } else {
        merged.push(tiles[i])
        i += 1
      }
    }

    // Fill row with merged tiles and zeros
    for (let col = 0; col < 4; col++) {
      newGrid[row][col] = merged[col] || 0
    }
  }

  return [newGrid, pointsGained]
}

/**
 * Make a move in the specified direction
 */
export function makeMove(
  state: GameState,
  direction: Direction
): GameState | null {
  let grid = cloneGrid(state.grid)
  let restoreFunction: ((g: Grid) => Grid) | null = null

  // Rotate grid to convert direction to "left" move
  switch (direction) {
    case 'left':
      // No rotation needed
      restoreFunction = (g) => g
      break
    case 'right':
      // Rotate 180° (2 times clockwise)
      grid = rotateGrid(rotateGrid(grid))
      restoreFunction = (g) => rotateGrid(rotateGrid(g))
      break
    case 'up':
      // Rotate 90° counter-clockwise
      grid = rotateGridCCW(grid)
      restoreFunction = (g) => rotateGrid(g) // Rotate clockwise to restore
      break
    case 'down':
      // Rotate 90° clockwise
      grid = rotateGrid(grid)
      restoreFunction = (g) => rotateGridCCW(g) // Rotate counter-clockwise to restore
      break
  }

  // Perform left move
  const [movedGrid, pointsGained] = moveLeft(grid)

  // Rotate back to original orientation
  const finalGrid = restoreFunction!(movedGrid)

  // Check if anything changed
  if (gridsEqual(state.grid, finalGrid)) {
    return null // No valid move
  }

  // Add random tile
  addRandomTile(finalGrid)

  // Calculate new state
  const newScore = state.score + pointsGained
  const highestTile = Math.max(...finalGrid.flat())
  const hasWon = highestTile >= 2048 && !state.hasWon

  return {
    grid: finalGrid,
    score: newScore,
    highestTile,
    movesCount: state.movesCount + 1,
    isGameOver: isGameOver(finalGrid),
    hasWon: hasWon || state.hasWon,
  }
}

/**
 * Check if game is over (no valid moves)
 */
export function isGameOver(grid: Grid): boolean {
  // Check for empty cells
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === 0) return false
    }
  }

  // Check for possible merges horizontally
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      if (grid[row][col] === grid[row][col + 1]) return false
    }
  }

  // Check for possible merges vertically
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === grid[row + 1][col]) return false
    }
  }

  return true
}

/**
 * Get available moves for current grid
 */
export function getAvailableMoves(grid: Grid): Direction[] {
  const moves: Direction[] = []
  const directions: Direction[] = ['up', 'down', 'left', 'right']

  for (const direction of directions) {
    let testGrid = cloneGrid(grid)
    let restoreFunction: (g: Grid) => Grid

    switch (direction) {
      case 'left':
        restoreFunction = (g) => g
        break
      case 'right':
        testGrid = rotateGrid(rotateGrid(testGrid))
        restoreFunction = (g) => rotateGrid(rotateGrid(g))
        break
      case 'up':
        testGrid = rotateGridCCW(testGrid)
        restoreFunction = (g) => rotateGrid(g)
        break
      case 'down':
        testGrid = rotateGrid(testGrid)
        restoreFunction = (g) => rotateGridCCW(g)
        break
    }

    const [movedGrid] = moveLeft(testGrid)
    
    // Rotate back
    const finalGrid = restoreFunction(movedGrid)

    if (!gridsEqual(grid, finalGrid)) {
      moves.push(direction)
    }
  }

  return moves
}

/**
 * Calculate a simple AI score for a grid (for bot opponents if needed)
 */
export function calculateGridScore(grid: Grid): number {
  let score = 0

  // Prefer keeping high tiles in corners
  const corners = [
    grid[0][0],
    grid[0][3],
    grid[3][0],
    grid[3][3],
  ]
  const maxCorner = Math.max(...corners)
  score += maxCorner * 10

  // Prefer monotonic rows/columns
  for (let row = 0; row < 4; row++) {
    let isMonotonic = true
    for (let col = 0; col < 3; col++) {
      if (grid[row][col] < grid[row][col + 1]) {
        isMonotonic = false
        break
      }
    }
    if (isMonotonic) score += 100
  }

  // Count empty cells
  const emptyCells = grid.flat().filter((cell) => cell === 0).length
  score += emptyCells * 50

  return score
}

/**
 * Serialize grid for storage/transmission
 */
export function serializeGrid(grid: Grid): string {
  return JSON.stringify(grid)
}

/**
 * Deserialize grid from string
 */
export function deserializeGrid(data: string): Grid {
  try {
    return JSON.parse(data)
  } catch {
    return initializeGrid()
  }
}

