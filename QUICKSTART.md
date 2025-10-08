# FAR2048 Quick Start Guide

Get FAR2048 running locally in under 10 minutes!

## 📋 Prerequisites

- Node.js 22.11.0+ ([Download](https://nodejs.org/))
- A Supabase account (free tier works!)
- A Privy account (free tier works!)

## 🚀 Quick Setup

### 1. Clone & Install (2 min)

```bash
# Clone the repo
git clone <your-repo-url>
cd FAR2048

# Install all dependencies
npm run setup
```

### 2. Supabase Setup (3 min)

```bash
# Go to https://supabase.com
# Create a new project
# Wait for it to provision (~2 min)

# Copy supabase/schema.sql
# Paste into Supabase SQL Editor
# Execute

# Enable Realtime for 'matches' and 'match_players' tables
# Go to Database > Replication > Enable for these tables

# Get your credentials from Settings > API:
# - Project URL
# - Anon key
# - Service role key (keep secret!)
```

### 3. Privy Setup (1 min)

```bash
# Go to https://privy.io
# Create a new app
# Copy your App ID
```

### 4. Configure Environment (2 min)

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x... # Optional for local dev
```

**Backend** (`backend/.env`):
```bash
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000
```

### 5. Run the App (1 min)

```bash
# Start both frontend and backend
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## ✅ Verify It Works

1. Open http://localhost:3000
2. You should see the FAR2048 lobby
3. Click "Create New Match"
4. Fill in wager (e.g., 10 USDC)
5. Create match
6. Match should appear in the lobby!

**Note:** For full functionality (blockchain interactions), you'll need to deploy smart contracts. For local development, the app works without them using mock data.

## 🎮 Test Gameplay

To test multiplayer locally:

1. Open multiple browser tabs to http://localhost:3000
2. Create a match in one tab
3. Join the match from another tab
4. Mark both players as "Ready"
5. Game should start!
6. Use arrow keys to play

## 📱 Test as Farcaster Mini App

### Enable Developer Mode

1. Go to https://farcaster.xyz/~/settings/developer-tools
2. Enable "Developer Mode"

### Deploy to Vercel (Free)

```bash
cd frontend
vercel --prod
```

### Share in Farcaster

Post your Vercel URL in a cast, and it will render as a Mini App!

## 🔧 Common Issues

### Port already in use
```bash
# Kill process on port 3000 or 3001
npx kill-port 3000
npx kill-port 3001
```

### Database connection failed
- Check Supabase URL and keys are correct
- Ensure project is active in Supabase dashboard

### Socket.IO not connecting
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_BACKEND_URL` in frontend env

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules frontend/node_modules backend/node_modules
npm run setup
```

## 📚 Next Steps

Once you have it running locally:

1. **Deploy Smart Contracts** (see [DEPLOYMENT.md](./DEPLOYMENT.md))
   - Deploy to Base/Arbitrum testnet
   - Update contract addresses in env

2. **Add Real Blockchain Interactions**
   - Implement USDC approvals
   - Connect to deployed contracts
   - Test with testnet USDC

3. **Deploy to Production** (see [DEPLOYMENT.md](./DEPLOYMENT.md))
   - Deploy backend to Render/Railway
   - Deploy frontend to Vercel
   - Configure production environment variables

4. **Launch on Farcaster**
   - Create official Mini App
   - Announce on Farcaster
   - Share with community!

## 🆘 Need Help?

- Check the full [README.md](./README.md)
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Open a GitHub issue

## 🎉 You're Ready!

You now have FAR2048 running locally. Start building, customizing, and shipping!

**Happy coding! 🚀**

