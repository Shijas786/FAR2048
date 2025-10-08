# Quick Setup Guide - Production Ready

## ✅ Changes Made

All demo mode code has been **completely removed**. The app now requires proper Farcaster authentication.

### What Changed:
1. ❌ **Removed**: Demo FID generation from localStorage
2. ❌ **Removed**: Fallback to FID 1 in all components
3. ❌ **Removed**: Demo mode in API client
4. ❌ **Removed**: Mock authentication in backend
5. ✅ **Added**: Strict Farcaster authentication requirement
6. ✅ **Added**: Proper error messages for unauthenticated users
7. ✅ **Added**: Quick Auth package to backend

---

## 🚀 Next Steps to Go Live

### 1. Install Quick Auth (Done ✅)
```bash
cd backend
npm install  # Already completed!
```

### 2. Set Up Environment Variables

Create `.env` files:

**Backend** (`backend/.env`):
```bash
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
HOSTNAME=your-backend-domain.com
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### 3. Deploy Backend

**Option A: Railway**
```bash
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

**Option B: Render**
- Connect GitHub repo
- Create new Web Service
- Point to `backend` folder
- Add environment variables
- Deploy

### 4. Deploy Frontend

**Vercel (Recommended)**
```bash
npm install -g vercel
cd frontend
vercel
# Follow prompts and add environment variables
vercel --prod
```

### 5. Register as Farcaster Mini App

1. Go to https://developers.farcaster.xyz
2. Create a new Mini App
3. Set URL to your Vercel deployment
4. Configure manifest (see PRODUCTION_DEPLOYMENT.md)

### 6. Test

Open in Warpcast:
```
https://warpcast.com/~/developers/frames?url=https://your-app.vercel.app
```

---

## ⚠️ Important Notes

### Local Development Won't Work Anymore
Since demo mode is removed, you **cannot** test locally by opening `localhost:3000` in a browser. The app will show:

> "Please open this app through Farcaster"

### Testing Options:

1. **Deploy to production** and test via Warpcast
2. **Use Farcaster dev tools**: 
   ```
   https://warpcast.com/~/developers/frames?url=http://localhost:3000
   ```
   (Note: Your backend must be publicly accessible)

3. **Use ngrok** for local backend:
   ```bash
   ngrok http 3001
   # Use the ngrok URL as your NEXT_PUBLIC_BACKEND_URL
   ```

---

## 📋 Pre-Deployment Checklist

Backend:
- [ ] Quick Auth installed (`npm install` completed)
- [ ] Environment variables set
- [ ] Supabase configured
- [ ] Can access `/health` endpoint

Frontend:
- [ ] Environment variables set
- [ ] Backend URL configured
- [ ] Build succeeds locally (`npm run build`)

Database:
- [ ] Supabase project created
- [ ] Schema deployed
- [ ] Migrations run

Farcaster:
- [ ] Mini App registered
- [ ] Manifest configured
- [ ] Webhook URL set (optional)

---

## 🔧 Quick Commands

**Start Backend (Dev)**
```bash
cd backend
npm run dev
```

**Start Frontend (Dev)**
```bash
cd frontend
npm run dev
```

**Build for Production**
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
npm start
```

---

## 📚 Full Documentation

See **PRODUCTION_DEPLOYMENT.md** for complete deployment instructions including:
- Smart contract deployment
- Database setup
- Monitoring setup
- Troubleshooting guide

---

## 🆘 Common Issues

### "Quick Auth not available"
- Make sure Quick Auth is installed: `cd backend && npm install`
- Check backend logs for initialization errors

### "Please open this app through Farcaster"
- App must be accessed via Farcaster/Warpcast
- Use dev frame URL for testing
- Cannot test directly in browser anymore

### "Authentication service unavailable"
- Quick Auth package not installed or failed to initialize
- Check backend logs on startup
- Verify `HOSTNAME` is set in backend `.env`

---

## ✨ You're Ready!

Your app is now production-ready with proper Farcaster authentication. No more demo mode!

**Next**: Follow PRODUCTION_DEPLOYMENT.md for detailed deployment steps.
