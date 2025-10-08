/**
 * Mock Farcaster Mini App SDK for Local Development
 * 
 * This is a temporary mock until @farcaster/miniapp-sdk is available
 * Replace with real SDK when available
 */

interface QuickAuthToken {
  token: string
}

const mockToken = 'mock_jwt_token_for_local_dev'

export const sdk = {
  actions: {
    ready: async () => {
      console.log('✅ Mock SDK: App ready')
      return Promise.resolve()
    },
  },
  
  quickAuth: {
    token: mockToken,
    
    getToken: async (options?: { force?: boolean; quickAuthServerOrigin?: string }): Promise<QuickAuthToken> => {
      console.log('🔑 Mock SDK: Getting Quick Auth token')
      // Return a mock JWT that includes a test FID
      return Promise.resolve({
        token: mockToken
      })
    },
    
    fetch: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      console.log('🌐 Mock SDK: Authenticated fetch to', input)
      
      // Add mock authorization header
      const headers = new Headers(init?.headers || {})
      headers.set('Authorization', `Bearer ${mockToken}`)
      
      return fetch(input, {
        ...init,
        headers,
      })
    },
  },
}

// Export for compatibility
export default sdk

