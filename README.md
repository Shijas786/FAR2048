# FAR2048 🎮

A 4-player real-time 2048 battle game built as a Farcaster Mini App with USDC betting on Base and Arbitrum.

![FAR2048 Banner](./assets/banner.png)

## 🌟 Features

- **Real-time Multiplayer**: Battle up to 4 players simultaneously
- **2048 Gameplay**: Classic tile-merging mechanics with competitive twist
- **USDC Betting**: Wager on Base or Arbitrum chains
- **Farcaster Integration**: Native mini app with Quick Auth
- **Gasless Transactions**: Optional gas sponsorship via Biconomy
- **Spectator Mode**: Watch live matches
- **Smart Contract Escrow**: Automated winner payouts

## 🏗️ Architecture

```
FAR2048/
├── frontend/          # Next.js app with Farcaster Mini App SDK
├── backend/           # Express server with Supabase & WebSocket
├── contracts/         # Solidity betting contracts
└── supabase/          # Database schema & migrations
```

## 📋 Prerequisites

- **Node.js**: v22.11.0 or higher
- **npm/pnpm/yarn**: Any modern package manager
- **Supabase Account**: For database and real-time features
- **Privy Account**: For wallet authentication
- **Alchemy/Infura**: RPC endpoints for Base & Arbitrum
- **Hardhat**: For smart contract deployment

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd FAR2048
npm run setup
```

### 2. Configure Environment

Copy `.env.example` to `.env` in each directory and fill in your values:

```bash
cp .env.example frontend/.env.local
cp .env.example backend/.env
cp .env.example contracts/.env
```

### 3. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the migration in `supabase/schema.sql`
3. Enable Realtime for the `matches` and `match_players` tables
4. Copy your project URL and anon key to `.env.local`

### 4. Deploy Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile

# Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy.js --network baseSepolia

# Deploy to Arbitrum Sepolia (testnet)
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

Copy the deployed contract addresses to your `.env.local` files.

### 5. Run Development Servers

```bash
# From root directory
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 🎮 How to Play

1. **Join/Create Match**: Enter lobby, select wager amount and chain
2. **Wait for Players**: Match starts when 4 players join (or countdown expires)
3. **Play 2048**: Use arrow keys or swipe to merge tiles
4. **2 Minute Battle**: Highest tile wins when time runs out
5. **Claim Winnings**: Winner automatically receives the pot

## 🔧 Smart Contract Details

### FAR2048Bet.sol

Deployed on Base and Arbitrum, handles:

- Match creation with USDC wagers
- Player joins with ERC20 approval
- Escrow of bet amounts
- Winner declaration and payout
- 1% platform fee (configurable)

**Key Functions:**
```solidity
createMatch(uint256 wagerAmount, address usdcToken)
joinMatch(uint256 matchId)
declareWinner(uint256 matchId, address winner)
```

## 📱 Farcaster Mini App Integration

The app uses the official `@farcaster/miniapp-sdk`:

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

// Authenticate user
const { token } = await sdk.quickAuth.getToken()

// Ready to display
await sdk.actions.ready()
```

### Mini App Embed

Add to your frame HTML:

```html
<meta property="fc:miniapp" content='{"version":"1","imageUrl":"https://far2048.vercel.app/og.png","button":{"title":"FAR2048","action":{"type":"launch","url":"https://far2048.vercel.app"}}}' />
```

## 🌐 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

### Backend (Render/Railway)

```bash
cd backend
# Push to GitHub and connect to Render/Railway
```

### Smart Contracts (Mainnet)

```bash
cd contracts
# Update hardhat.config.js with mainnet RPCs
npx hardhat run scripts/deploy.js --network base
npx hardhat run scripts/deploy.js --network arbitrum
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Mini App SDK | @farcaster/miniapp-sdk |
| Web3 | wagmi, viem, Privy |
| Backend | Express, Node.js |
| Database | Supabase (PostgreSQL + Realtime) |
| Smart Contracts | Solidity, Hardhat |
| Chains | Base, Arbitrum |
| Gas Sponsorship | Biconomy (optional) |

## 📊 Database Schema

### matches
- id, status, wager_amount, chain, created_at, started_at, ended_at
- winner_fid, total_pot, platform_fee

### match_players
- match_id, fid, wallet_address, score, highest_tile
- join_order, is_ready

### users
- fid, username, wallet_address, total_winnings, matches_won

### transactions
- match_id, fid, amount, tx_hash, type (join/payout)

## 🧪 Testing

```bash
# Test smart contracts
cd contracts
npx hardhat test

# Test backend
cd backend
npm run test

# Test frontend
cd frontend
npm run test
```

## 🎨 UI Design Notes

- **Responsive**: Optimized for 320×480px Farcaster frame
- **Theme**: Neon dark with Base blue (#0052FF) and Arbitrum teal (#2D374B)
- **Glassmorphism**: Panels with backdrop blur and soft glow
- **4-Grid Layout**: Mini 2048 grids for each player with unique borders
- **Live Updates**: Real-time score tracking and animations

## 🔐 Security Considerations

- Smart contracts audited (recommended before mainnet)
- Private keys stored securely (never commit)
- Rate limiting on backend endpoints
- Input validation on all user actions
- USDC approval checks before match join

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🐛 Troubleshooting

### "Node.js version too old"
Update to Node.js 22.11.0+: https://nodejs.org/

### "Infinite loading screen"
Make sure `sdk.actions.ready()` is called after app loads

### "Transaction failed"
Check USDC approval and wallet balance

### "Match not starting"
Verify Supabase Realtime is enabled and backend is running

## 📞 Support

- Discord: [Join our server](#)
- Twitter: [@FAR2048](#)
- Email: support@far2048.xyz

---

Built with ❤️ for Farcaster

