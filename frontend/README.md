# FAR2048 Frontend

Next.js 14 frontend for FAR2048 Farcaster Mini App.

## Features

- **Farcaster Mini App SDK**: Native authentication and integration
- **Quick Auth**: Seamless user authentication
- **Privy**: Wallet connection with embedded wallets
- **Real-time Multiplayer**: Socket.IO for live game state
- **2048 Game Engine**: Full game logic with animations
- **Responsive UI**: Optimized for 320×480px frame
- **Tailwind CSS**: Modern, animated design
- **Framer Motion**: Smooth transitions and animations

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Smart Contract Addresses
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS=0x...
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── layout.tsx      # Root layout with metadata
│   │   ├── page.tsx        # Main entry point
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── Lobby.tsx       # Match browsing/creation
│   │   ├── GameArena.tsx   # Main game screen
│   │   ├── Results.tsx     # Match results
│   │   ├── Game2048Grid.tsx
│   │   ├── MiniPlayerGrid.tsx
│   │   ├── MatchCard.tsx
│   │   ├── CreateMatchModal.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── Providers.tsx   # Context providers
│   └── lib/                # Utilities and logic
│       ├── game2048.ts     # 2048 game engine
│       ├── store.ts        # Zustand state management
│       ├── socket.ts       # Socket.IO client
│       └── api.ts          # Backend API client
```

## Key Technologies

### Farcaster Mini App SDK

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// Get Quick Auth token
const { token } = await sdk.quickAuth.getToken()

// Make authenticated request
const res = await sdk.quickAuth.fetch('/api/endpoint')

// Signal app is ready
await sdk.actions.ready()
```

### State Management (Zustand)

```typescript
const { currentView, setCurrentView, user, activeMatch } = useGameStore()
```

### Socket.IO Real-time

```typescript
import { initializeSocket, sendGameMove } from '@/lib/socket'

// Initialize connection
initializeSocket()

// Send move
sendGameMove(matchId, fid, direction, gridState, score, highestTile, movesCount)
```

### 2048 Game Logic

```typescript
import { createNewGame, makeMove } from '@/lib/game2048'

const gameState = createNewGame()
const newState = makeMove(gameState, 'up')
```

## Components

### Lobby

- Browse open matches
- Filter by chain (Base/Arbitrum)
- Create new match with custom wager
- View recent winners
- Real-time match list updates

### GameArena

- Waiting room with ready-up system
- Live 4-player mini grids
- Full-size playable grid for current user
- Keyboard controls (arrow keys, WASD)
- Touch/swipe controls for mobile
- Real-time score updates
- 2-minute countdown timer

### Results

- Winner announcement with animations
- Final leaderboard with rankings
- Claim winnings button for winner
- AI-generated match summary
- Return to lobby

## Animations

Using Framer Motion for smooth transitions:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
>
  Content
</motion.div>
```

## Responsive Design

- Mobile-first approach
- Optimized for 320×480px Farcaster frame
- Scales up for larger screens
- Touch-friendly controls
- Glassmorphism UI with backdrop blur

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

### Environment Variables

Set all `NEXT_PUBLIC_*` variables in Vercel dashboard.

### Custom Domain

Add your custom domain in Vercel and update the Mini App embed URL.

## Farcaster Mini App Integration

### Metadata

Frame metadata is set in `layout.tsx`:

```typescript
{
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://far2048.vercel.app/embed-image.png',
      button: {
        title: 'FAR2048',
        action: {
          type: 'launch',
          url: 'https://far2048.vercel.app',
        },
      },
    }),
  },
}
```

### Quick Auth Flow

1. User opens Mini App in Farcaster
2. SDK automatically handles authentication
3. `sdk.quickAuth.getToken()` provides JWT
4. JWT sent in API requests for user identification
5. Backend verifies JWT and extracts FID

## Performance Optimization

- React Query for efficient data fetching
- Memoized components to prevent re-renders
- Optimistic UI updates
- Socket.IO reconnection logic
- Lazy loading where possible

## Testing

```bash
npm run test
```

## Troubleshooting

### "Infinite loading screen"

Make sure `sdk.actions.ready()` is called after app initialization.

### Socket connection failed

Check that `NEXT_PUBLIC_BACKEND_URL` is correct and backend is running.

### Quick Auth token invalid

Verify `HOSTNAME` matches in backend `.env` and frontend request origin.

## License

MIT

