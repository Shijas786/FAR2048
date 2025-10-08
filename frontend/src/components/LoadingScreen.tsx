'use client'

/**
 * Loading Screen Component
 * Shown while app initializes
 */

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="text-center">
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-base-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-glow">
            2048
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-base-400 to-purple-400 bg-clip-text text-transparent">
          FAR2048
        </h1>
        <p className="text-gray-400 mb-8">Multiplayer 2048 Battle</p>

        {/* Spinner */}
        <div className="w-12 h-12 mx-auto spinner" />

        {/* Loading text */}
        <p className="text-sm text-gray-500 mt-6 animate-pulse">
          Loading game...
        </p>
      </div>
    </div>
  )
}

