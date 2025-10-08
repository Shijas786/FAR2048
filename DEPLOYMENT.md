# FAR2048 Deployment Guide

Complete deployment guide for FAR2048 to production.

## Prerequisites

- Node.js 22.11.0+
- Supabase account
- Privy account
- Alchemy/Infura RPC endpoints
- Wallet with ETH/USDC for deployment
- Vercel account (for frontend)
- Render/Railway account (for backend)

## Step 1: Smart Contracts

### Deploy to Testnet (Recommended First)

```bash
cd contracts
npm install
npx hardhat compile

# Deploy to Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

**Save the contract addresses!** You'll need them for environment variables.

### Deploy to Mainnet

```bash
# Deploy to Base
npx hardhat run scripts/deploy.js --network base

# Deploy to Arbitrum
npx hardhat run scripts/deploy.js --network arbitrum
```

### Verify Contracts

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> "<FEE_COLLECTOR_ADDRESS>"
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS> "<FEE_COLLECTOR_ADDRESS>"
```

## Step 2: Database (Supabase)

### Create Project

1. Go to https://supabase.com
2. Create new project
3. Wait for provisioning (~2 minutes)

### Run Migration

1. Open SQL Editor in Supabase dashboard
2. Copy entire contents of `supabase/schema.sql`
3. Execute

### Enable Realtime

1. Go to **Database** > **Replication**
2. Enable realtime for:
   - `matches`
   - `match_players`

### Get Credentials

From **Settings** > **API**:
- Project URL
- Anon key (public)
- Service role key (secret, for backend only)

## Step 3: Backend Deployment

### Option A: Render

1. Push code to GitHub
2. Go to https://render.com
3. New > Web Service
4. Connect your repository
5. Configure:
   - **Name**: `far2048-backend`
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Port**: 3001

6. Add environment variables (see below)
7. Deploy

### Option B: Railway

1. Push code to GitHub
2. Go to https://railway.app
3. New Project > Deploy from GitHub
4. Select repository
5. Add environment variables
6. Deploy

### Backend Environment Variables

```bash
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://far2048.vercel.app
HOSTNAME=far2048-backend.onrender.com  # or your backend URL

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Blockchain
PRIVATE_KEY=your_deployer_private_key
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_CONTRACT_ADDRESS=0x...
ARBITRUM_CONTRACT_ADDRESS=0x...

# Optional
OPENAI_API_KEY=your_openai_key
```

## Step 4: Frontend Deployment

### Vercel (Recommended)

```bash
cd frontend
vercel login
vercel --prod
```

Or via dashboard:

1. Import GitHub repository
2. Framework: Next.js
3. Root directory: `frontend`
4. Add environment variables (see below)
5. Deploy

### Frontend Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=https://far2048-backend.onrender.com
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wc_project_id

# Contract addresses
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BASE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

## Step 5: Privy Configuration

1. Go to https://privy.io
2. Create new app
3. Configure:
   - **Name**: FAR2048
   - **Chains**: Base, Arbitrum
   - **Allowed Origins**: Add your Vercel domain
4. Enable embedded wallets
5. Copy App ID to environment variables

## Step 6: Farcaster Mini App Setup

### Enable Developer Mode

1. Go to https://farcaster.xyz/~/settings/developer-tools
2. Enable "Developer Mode"

### Create Mini App

1. Click "Create Mini App" in developer tools
2. Fill in details:
   - **Name**: FAR2048
   - **URL**: `https://far2048.vercel.app`
   - **Description**: 4-player real-time 2048 battle with USDC betting
   - **Image**: Upload 1200x630 OG image

3. Save and get your Mini App ID

### Test Frame

Share in Farcaster to test:
```
https://far2048.vercel.app
```

## Step 7: Post-Deployment

### Update CORS

Make sure backend CORS allows your frontend domain:

```typescript
// backend/src/server.ts
cors({
  origin: 'https://far2048.vercel.app',
  credentials: true,
})
```

### Test Everything

1. ✅ Frontend loads in Farcaster
2. ✅ Quick Auth works
3. ✅ Can create match
4. ✅ Can join match
5. ✅ Socket.IO connection works
6. ✅ Game plays correctly
7. ✅ Winner is declared
8. ✅ Smart contract interactions work

### Monitor

- Vercel Analytics
- Render/Railway Logs
- Supabase Dashboard (queries, connections)
- Contract transactions on Basescan/Arbiscan

## Troubleshooting

### Frontend shows infinite loading

- Check that `sdk.actions.ready()` is called
- Verify Quick Auth is initialized
- Check browser console for errors

### Socket.IO connection fails

- Verify WebSocket support on backend host
- Check CORS configuration
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct

### Smart contract calls fail

- Ensure contract addresses are correct
- Verify wallet has ETH for gas
- Check USDC approval
- Verify network (Base vs Arbitrum)

### Quick Auth fails

- Verify `HOSTNAME` matches in backend
- Check that Farcaster Mini App is approved
- Ensure frontend is in allowed origins

## Scaling Considerations

### Database

- Enable connection pooling
- Add indexes for common queries
- Consider read replicas for heavy load

### Backend

- Scale horizontally (multiple instances)
- Add Redis for session storage
- Implement rate limiting
- Use CDN for static assets

### Frontend

- Enable Vercel Edge functions
- Optimize images
- Enable caching headers
- Consider ISR for leaderboards

## Security Checklist

- [ ] Private keys secured (never committed)
- [ ] Service role key only in backend
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Smart contracts audited (for mainnet)
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] Environment variables in secure storage

## Cost Estimates

### Monthly (Moderate Usage)

- **Supabase**: $0-25 (free tier sufficient for start)
- **Render/Railway**: $7-20 (basic plan)
- **Vercel**: $0-20 (hobby/pro)
- **Privy**: $0 (free tier: 1000 MAUs)
- **RPC**: $0-50 (Alchemy free tier: 300M compute units)
- **OpenAI**: $0-10 (optional, for summaries)

**Total: ~$7-125/month**

### Gas Costs

- Contract deployment: ~$20-50 per chain
- Winner declaration: ~$2-5 per match (paid from platform fee)

## Support

If you encounter issues:

1. Check logs (Vercel, Render, Supabase)
2. Review environment variables
3. Test each component independently
4. Open GitHub issue with details

## Next Steps

After deployment:

1. Announce on Farcaster
2. Share in relevant channels
3. Monitor analytics
4. Gather user feedback
5. Iterate and improve

---

**Congratulations! FAR2048 is live! 🎉**

