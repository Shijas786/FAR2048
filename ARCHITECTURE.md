# FAR2048 Architecture

Technical architecture and system design overview.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Farcaster Client                         │
│  (Warpcast, Supercast, or other Farcaster apps)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 FAR2048 Mini App (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Lobby      │  │  Game Arena  │  │   Results    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  Next.js 14 | Farcaster SDK | Privy | Socket.IO Client     │
└────────────────────┬───────────────────┬────────────────────┘
                     │                   │
        ┌────────────┴─────┐    ┌───────┴───────┐
        ▼                  ▼    ▼               ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Quick Auth     │  │ Backend API    │  │ Blockchain     │
│ Server         │  │ (Express)      │  │ (Base/Arb)     │
│ (Farcaster)    │  │ + Socket.IO    │  │                │
└────────────────┘  └────────┬───────┘  └────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   Supabase     │
                    │  (PostgreSQL)  │
                    └────────────────┘
```

## Component Breakdown

### 1. Frontend (Next.js 14)

**Tech Stack:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Farcaster Mini App SDK
- Privy (wallet auth)
- Socket.IO Client
- Zustand (state management)
- React Query (data fetching)

**Key Features:**
- Server-side rendering for SEO
- Responsive design (320×480px optimized)
- Real-time game state updates
- Smooth animations and transitions
- Wallet connection and management
- Quick Auth integration

**State Management:**
```typescript
// Global state (Zustand)
- currentView: 'lobby' | 'game' | 'results'
- user: User | null
- activeMatch: Match | null
- players: MatchPlayer[]
- gameState: GameState | null
- remainingTime: number
- isConnected: boolean

// Server state (React Query)
- matches (cached, auto-refetch)
- leaderboard (cached)
- user stats (cached)
```

### 2. Backend (Express + Socket.IO)

**Tech Stack:**
- Node.js
- Express.js
- Socket.IO (WebSocket)
- TypeScript
- Supabase Client
- viem (blockchain)
- OpenAI (optional)
- Zod (validation)

**API Routes:**
```
GET    /api/matches              - List matches
GET    /api/matches/:id          - Get match details
POST   /api/matches/create       - Create match (auth)
POST   /api/matches/join         - Join match (auth)
GET    /api/users/:fid           - Get user profile
GET    /api/users/:fid/matches   - Get user matches
GET    /api/leaderboard          - Get leaderboard
POST   /api/webhooks/declare-winner - Declare winner (admin)
```

**Socket.IO Events:**
```typescript
// Client → Server
- join-match
- leave-match
- player-ready
- game-move
- spectate-match

// Server → Client
- match-state
- player-joined
- player-ready-update
- match-starting
- match-started
- player-move
- player-milestone
- match-ended
- match-update
- error
```

### 3. Database (Supabase)

**Schema:**

```sql
users (
  id, fid, username, wallet_address,
  total_winnings, matches_played, matches_won, highest_tile
)

matches (
  id, chain, wager_amount, max_players, status,
  current_players, total_pot, winner_fid, started_at, ended_at
)

match_players (
  match_id, fid, wallet_address, join_order,
  score, highest_tile, moves_count, live_grid, final_grid
)

transactions (
  match_id, fid, type, amount, chain, tx_hash, status
)

leaderboard (materialized view)
```

**Realtime Subscriptions:**
- Clients subscribe to `matches` table changes
- Clients subscribe to `match_players` table changes
- Updates broadcast automatically via Supabase Realtime

### 4. Smart Contracts (Solidity)

**FAR2048Bet.sol:**

```solidity
// Core functions
createMatch(uint256 wagerAmount, address usdcToken, uint256 maxPlayers) → uint256
joinMatch(uint256 matchId)
declareWinner(uint256 matchId, address winner)
cancelMatch(uint256 matchId)

// State
Match {
  id, host, wagerAmount, usdcToken, maxPlayers,
  currentPlayers, totalPot, winner, status
}

// Events
MatchCreated, PlayerJoined, MatchStarted, MatchEnded
```

**Deployment:**
- Base: 0x... (mainnet)
- Arbitrum: 0x... (mainnet)
- Gas optimized with OpenZeppelin libraries
- ReentrancyGuard for security

### 5. Authentication (Farcaster Quick Auth)

**Flow:**
```
1. User opens Mini App in Farcaster
   ↓
2. SDK automatically signs SIWF message
   ↓
3. Quick Auth Server verifies signature
   ↓
4. Server issues JWT with FID
   ↓
5. Frontend includes JWT in API requests
   ↓
6. Backend verifies JWT and extracts FID
```

**Token Payload:**
```json
{
  "sub": 6841,           // FID
  "iss": "https://auth.farcaster.xyz",
  "aud": "miniapps.farcaster.xyz",
  "exp": 1747768419,     // 1 hour expiry
  "iat": 1747764819
}
```

### 6. Wallet Integration (Privy)

**Features:**
- Embedded wallets (no external app needed)
- Multi-chain support (Base, Arbitrum)
- USDC token approvals
- Transaction signing
- Wallet recovery

**Flow:**
```
1. User connects wallet via Privy
   ↓
2. Request USDC approval for contract
   ↓
3. User signs transaction
   ↓
4. Call contract.joinMatch()
   ↓
5. Wait for confirmation
   ↓
6. Update backend with tx hash
```

## Data Flow

### Match Creation

```
Frontend                Backend              Blockchain           Database
   │                      │                      │                  │
   │─────create()────────>│                      │                  │
   │                      │─────insert()─────────────────────────>│
   │                      │<─────match ID────────────────────────│
   │<─────match ID────────│                      │                  │
```

### Joining Match

```
Frontend                Backend              Blockchain           Database
   │                      │                      │                  │
   │──approve USDC────────────────────────────>│                  │
   │<─────tx hash─────────────────────────────│                  │
   │──joinMatch()─────────────────────────────>│                  │
   │<─────tx hash─────────────────────────────│                  │
   │                      │                      │                  │
   │─────join()─────────>│                      │                  │
   │   (with tx hash)     │                      │                  │
   │                      │─────insert player─────────────────────>│
   │                      │─────update match──────────────────────>│
   │                      │<─────success─────────────────────────│
   │<─────success─────────│                      │                  │
   │                      │                      │                  │
   │◄────Socket.IO: player-joined────────────────────────────────│
```

### Game Play (Real-time)

```
Frontend A              Backend              Frontend B,C,D
   │                      │                      │
   │────make move()───────>│                      │
   │  (local update)      │                      │
   │                      │─update DB────────────│
   │                      │                      │
   │                      │────Socket.IO─────────>│
   │                      │  player-move event   │ (update UI)
   │                      │                      │
```

### Match End & Winner Declaration

```
Backend Timer          Backend              Blockchain           Database
   │                      │                      │                  │
   │─match ends───────────>│                      │                  │
   │                      │─get winner───────────────────────────>│
   │                      │<─winner data─────────────────────────│
   │                      │─update match─────────────────────────>│
   │                      │  (status=ended)                        │
   │                      │                      │                  │
   │                      │──declareWinner()─────>│                  │
   │                      │<───tx hash───────────│                  │
   │                      │                      │                  │
   │                      │─update payout────────────────────────>│
   │                      │                      │                  │
   │◄────Socket.IO: match-ended──────────────────────────────────│
```

## Security Considerations

### Frontend
- Input validation
- XSS prevention (React built-in)
- CSRF protection via SameSite cookies
- Rate limiting on API calls
- No sensitive keys in client

### Backend
- Quick Auth JWT verification
- Rate limiting (express-rate-limit)
- Input sanitization (Zod schemas)
- SQL injection prevention (Supabase parameterized queries)
- CORS restrictions
- Service role key protected

### Smart Contracts
- ReentrancyGuard
- SafeERC20 for token transfers
- Access control (Ownable)
- Input validation
- Max fee caps
- Emergency pause mechanism (future)

### Database
- Row Level Security (RLS) enabled
- Service role for backend only
- Anon key for frontend (read-only)
- Encrypted at rest
- Regular backups

## Performance Optimizations

### Frontend
- Next.js automatic code splitting
- React Query caching
- Memoized components
- Lazy loading
- Image optimization
- Framer Motion GPU acceleration

### Backend
- Connection pooling
- Database indexes
- Materialized views for leaderboards
- Socket.IO room-based broadcasting
- Response caching

### Database
- Indexed queries
- Materialized leaderboard view
- Realtime subscriptions (efficient pub/sub)
- EXPLAIN ANALYZE for slow queries

## Scalability

### Current Limits
- ~100 concurrent matches
- ~400 concurrent players
- Supabase free tier: 2GB database, 500MB storage
- Backend: Single instance

### Scaling Strategy

**Phase 1 (0-1000 users):**
- Current architecture sufficient
- Vertical scaling (larger backend instance)

**Phase 2 (1000-10000 users):**
- Multiple backend instances (load balancer)
- Redis for session/state management
- Database read replicas
- CDN for static assets

**Phase 3 (10000+ users):**
- Microservices (match service, user service)
- Message queue (RabbitMQ/SQS)
- Kubernetes orchestration
- Multi-region deployment
- Dedicated game servers

## Monitoring & Observability

### Metrics to Track
- Active matches
- Concurrent users
- Match completion rate
- Average game duration
- API response times
- Socket.IO connection count
- Database query performance
- Smart contract gas usage

### Tools
- Vercel Analytics (frontend)
- Render/Railway Logs (backend)
- Supabase Dashboard (database)
- Etherscan/Basescan (blockchain)
- Custom dashboard (future)

## Future Enhancements

1. **Tournaments**: Multi-round competitions
2. **Leaderboard Seasons**: Weekly/monthly resets
3. **Achievements**: Badges and milestones
4. **Replay System**: Watch past matches
5. **Spectator Chat**: Live commenting
6. **NFT Rewards**: Special tiles as NFTs
7. **Custom Themes**: User-selectable UI themes
8. **Practice Mode**: Play solo without betting
9. **Friend Challenges**: Private matches
10. **Mobile Apps**: Native iOS/Android

## Conclusion

FAR2048 is built with a modern, scalable architecture that leverages the best of Web3, real-time multiplayer, and Farcaster's social graph. The system is designed to handle growth while maintaining performance and security.

