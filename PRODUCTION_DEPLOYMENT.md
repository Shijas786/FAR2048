# FAR2048 Production Deployment Guide

## ✅ Demo Mode Removed - Production Ready

All demo mode code has been removed. The app now requires proper Farcaster authentication to function.

---

## Prerequisites

1. **Farcaster Account** - You'll need a Farcaster account to create a Mini App
2. **Supabase Project** - For database and real-time features
3. **Deployment Platforms**:
   - Frontend: Vercel (recommended) or any Next.js host
   - Backend: Railway, Render, or any Node.js host
4. **Smart Contracts** - Deploy to Base/Arbitrum (see contracts folder)

---

## 1. Backend Deployment

### Install Quick Auth Package
```bash
cd backend
npm install @farcaster/quick-auth
```

### Environment Variables
Create a `.env` file in the `backend` directory:

```bash
# Server
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Quick Auth
HOSTNAME=your-backend-api.com  # WITHOUT https://

# Smart Contracts
BASE_CONTRACT_ADDRESS=0x...
ARBITRUM_CONTRACT_ADDRESS=0x...
```

### Deploy to Railway/Render

#### Railway:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Render:
1. Connect your GitHub repo
2. Create a new Web Service
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables

### Verify Deployment
```bash
curl https://your-backend-api.com/health
```

---

## 2. Frontend Deployment

### Environment Variables
Create `.env.local` in the `frontend` directory:

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Your app URL (set after Vercel deployment)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Privy (for wallet connection)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Smart Contracts
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BASE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel

# Follow prompts:
# 1. Link to your Vercel account
# 2. Add environment variables
# 3. Deploy

# For production:
vercel --prod
```

### Update NEXT_PUBLIC_APP_URL
After deployment, update your `.env.local` with the actual Vercel URL:
```bash
NEXT_PUBLIC_APP_URL=https://far2048.vercel.app
```

Redeploy:
```bash
vercel --prod
```

---

## 3. Register Farcaster Mini App

### Option A: Farcaster Developer Portal
1. Go to https://developers.farcaster.xyz
2. Create a new Mini App
3. Set the app URL to your Vercel deployment
4. Set the manifest URL: `https://your-app.vercel.app/manifest.json`

### Option B: Warpcast
1. Open Warpcast mobile app
2. Go to Settings → Developer Tools
3. Register new Mini App
4. Enter your app details and URL

### Manifest Configuration
Create `frontend/public/manifest.json`:

```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjEyMzQ1LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6InB1YmxpY19rZXkifQ",
    "payload": "SIGNED_PAYLOAD"
  },
  "frame": {
    "version": "0.0.1",
    "name": "FAR2048",
    "iconUrl": "https://your-app.vercel.app/icon.png",
    "homeUrl": "https://your-app.vercel.app",
    "imageUrl": "https://your-app.vercel.app/preview.png",
    "splashImageUrl": "https://your-app.vercel.app/splash.png",
    "splashBackgroundColor": "#0052FF",
    "webhookUrl": "https://your-backend-api.com/api/webhooks/farcaster"
  }
}
```

---

## 4. Database Setup (Supabase)

### Run Migrations
```bash
# Connect to your Supabase project
psql -h db.your-project.supabase.co -U postgres -d postgres

# Run the schema
\i supabase/schema.sql

# Run migrations
\i supabase/migrations/add_room_code_and_approval.sql
```

### Or use Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Click "SQL Editor"
3. Paste the contents of `supabase/schema.sql`
4. Click "Run"
5. Repeat for migrations

---

## 5. Smart Contract Deployment

### Deploy Contracts
```bash
cd contracts
npm install

# Copy env example
cp .env.example .env

# Edit .env with your keys
nano .env
```

Add to `.env`:
```bash
PRIVATE_KEY=your_deployer_wallet_private_key
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASESCAN_API_KEY=your_basescan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key
```

### Deploy to Base
```bash
npx hardhat run scripts/deploy.js --network base
```

### Deploy to Arbitrum
```bash
npx hardhat run scripts/deploy.js --network arbitrum
```

### Update Contract Addresses
Update your frontend and backend `.env` files with the deployed contract addresses.

---

## 6. Testing Production

### Test Authentication Flow
1. Open your app in Warpcast: `https://warpcast.com/~/developers/frames?url=https://your-app.vercel.app`
2. You should see authentication prompt
3. After authentication, you should be in the lobby

### Test Multiplayer
1. Open app on two different devices/accounts
2. Create a match
3. Join from second device
4. Test real-time gameplay

### Check Logs

**Backend Logs:**
```bash
# Railway
railway logs

# Render
# Check logs in dashboard
```

**Frontend Logs:**
```bash
# Vercel
vercel logs
```

---

## 7. Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads in Farcaster
- [ ] User authentication works
- [ ] Can create matches
- [ ] Can join matches
- [ ] Real-time updates work
- [ ] Socket.IO connection stable
- [ ] Smart contracts deployed
- [ ] Contract addresses updated
- [ ] Database migrations complete
- [ ] CORS configured correctly
- [ ] SSL certificates active

---

## Troubleshooting

### "Quick Auth not available"
- Make sure `@farcaster/quick-auth` is installed in backend
- Verify `HOSTNAME` is set correctly in backend `.env`
- Check backend logs for Quick Auth initialization

### "Please open this app through Farcaster"
- App must be opened via Farcaster/Warpcast
- For testing, use: `https://warpcast.com/~/developers/frames?url=YOUR_URL`

### Socket.IO Connection Failed
- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check CORS settings in backend
- Ensure backend is accessible from frontend domain

### Authentication Failed
- Check backend logs for auth errors
- Verify `HOSTNAME` matches your backend domain
- Ensure Quick Auth package is installed

---

## Monitoring & Maintenance

### Set Up Monitoring
- Use Vercel Analytics for frontend
- Use Railway/Render monitoring for backend
- Set up Sentry for error tracking
- Monitor Supabase usage

### Regular Updates
```bash
# Update dependencies
npm update

# Check for security issues
npm audit fix

# Redeploy
vercel --prod
railway up
```

---

## Support

- **Farcaster Docs**: https://docs.farcaster.xyz
- **Quick Auth Docs**: https://docs.farcaster.xyz/reference/quick-auth
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Your app is now production-ready! 🚀**

No more demo mode - users must authenticate through Farcaster to play.
