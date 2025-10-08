# FAR2048 Backend

Express.js backend server with Socket.IO for real-time multiplayer game state.

## Features

- **REST API**: Match management, user profiles, leaderboards
- **WebSocket**: Real-time game state synchronization
- **Quick Auth**: Farcaster authentication
- **Blockchain Integration**: Smart contract interactions via viem
- **Database**: Supabase for persistent storage

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env` file:

```bash
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
HOSTNAME=localhost:3001

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Blockchain (for winner declaration)
PRIVATE_KEY=your_private_key
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_CONTRACT_ADDRESS=0x...
ARBITRUM_CONTRACT_ADDRESS=0x...

# Optional
OPENAI_API_KEY=your_openai_key
```

### 3. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3001`

## API Endpoints

### Matches

- `GET /api/matches` - List matches (query: status, chain, limit, offset)
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/create` - Create match (requires auth)
- `POST /api/matches/join` - Join match (requires auth)
- `GET /api/matches/:id/players` - Get players in match

### Users

- `GET /api/users/:fid` - Get user profile
- `GET /api/users/:fid/matches` - Get user match history
- `GET /api/users/:fid/stats` - Get detailed user stats
- `PUT /api/users/me` - Update own profile (requires auth)

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard (query: sortBy, limit, offset)
- `GET /api/leaderboard/top/:metric` - Top N by metric
- `GET /api/leaderboard/rank/:fid` - Get user's rank
- `GET /api/leaderboard/recent-winners` - Recent match winners
- `POST /api/leaderboard/refresh` - Refresh leaderboard cache

### Webhooks

- `POST /api/webhooks/declare-winner` - Declare winner on-chain
- `POST /api/webhooks/transaction-confirmed` - Handle tx confirmation

### Health

- `GET /health` - Health check

## Socket.IO Events

### Client → Server

- `join-match` - Join match room
- `leave-match` - Leave match room
- `player-ready` - Toggle ready status
- `game-move` - Send game move
- `spectate-match` - Join as spectator

### Server → Client

- `match-state` - Current match state
- `player-joined` - New player joined
- `player-ready-update` - Player ready status changed
- `match-starting` - Match starting countdown
- `match-started` - Match has started
- `player-move` - Player made a move
- `player-milestone` - Player reached milestone (e.g., 2048 tile)
- `match-ended` - Match ended with winner
- `match-update` - General match update
- `error` - Error message

## Architecture

```
backend/
├── src/
│   ├── server.ts           # Main server setup
│   ├── middleware/
│   │   ├── quickAuth.ts    # Farcaster auth middleware
│   │   └── errorHandler.ts # Global error handling
│   ├── routes/
│   │   ├── matches.ts      # Match API endpoints
│   │   ├── users.ts        # User API endpoints
│   │   ├── leaderboard.ts  # Leaderboard endpoints
│   │   └── webhooks.ts     # Webhook handlers
│   └── lib/
│       ├── supabase.ts     # Supabase client
│       ├── blockchain.ts   # Blockchain utilities
│       └── socketHandlers.ts # Socket.IO logic
```

## Authentication

Uses Farcaster Quick Auth. Frontend sends JWT in Authorization header:

```
Authorization: Bearer <quick_auth_jwt>
```

Middleware extracts FID from JWT and attaches to `req.user`.

## Real-time Flow

1. Client connects via Socket.IO
2. Client joins match room: `socket.emit('join-match', matchId)`
3. Players toggle ready: `socket.emit('player-ready', { matchId, fid, isReady })`
4. When all ready, match starts automatically
5. Players send moves: `socket.emit('game-move', { matchId, fid, gridState, ... })`
6. Server broadcasts to all: `io.to('match:id').emit('player-move', ...)`
7. After 2 minutes, match ends automatically
8. Winner declared on-chain via webhook

## Database Integration

Uses Supabase with service role key (bypasses RLS):

```typescript
import { supabase } from './lib/supabase'

const { data, error } = await supabase
  .from('matches')
  .select('*')
  .eq('status', 'open')
```

## Blockchain Integration

Uses viem for type-safe blockchain interactions:

```typescript
import { declareWinnerOnChain } from './lib/blockchain'

const txHash = await declareWinnerOnChain(
  'base',
  BigInt(contractMatchId),
  winnerAddress
)
```

## Production Deployment

### Vercel

Not recommended (limited WebSocket support). Use for API-only deployment.

### Render / Railway

1. Connect GitHub repo
2. Set environment variables
3. Deploy
4. Update FRONTEND_URL in env

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## Monitoring

- Request logging (dev mode)
- Error tracking (add Sentry in production)
- WebSocket connection logging
- Database query performance (Supabase dashboard)

## Security

- Quick Auth JWT verification
- CORS configured for specific origin
- Input validation with Zod
- Rate limiting (add in production)
- Webhook signatures (add in production)

## Testing

```bash
npm run test
```

## License

MIT

