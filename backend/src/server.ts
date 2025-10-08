/**
 * FAR2048 Backend Server
 * 
 * Main Express server with Socket.IO for real-time game state
 * Handles match management, player synchronization, and blockchain integration
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import matchRoutes from './routes/matches';
import userRoutes from './routes/users';
import leaderboardRoutes from './routes/leaderboard';
import webhookRoutes from './routes/webhooks';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { quickAuthMiddleware } from './middleware/quickAuth';

// Import socket handlers
import { setupSocketHandlers } from './lib/socketHandlers';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const socketOrigins = ['http://localhost:3000', 'https://far-2048.vercel.app'];
if (process.env.FRONTEND_URL) {
  socketOrigins.push(process.env.FRONTEND_URL);
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to routes via app.locals
app.locals.io = io;

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://far-2048.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected route example (requires Quick Auth)
app.get('/api/me', quickAuthMiddleware, (req: Request, res: Response) => {
  res.json({ fid: req.user?.fid });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

// ============================================
// SOCKET.IO SETUP
// ============================================

setupSocketHandlers(io);

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('🚀 FAR2048 Backend Server');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Server: ws://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io };

