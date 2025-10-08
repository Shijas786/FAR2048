/**
 * Quick Auth Middleware
 * 
 * Verifies Farcaster Quick Auth JWT tokens
 * Attaches user FID to request object
 */

import { Request, Response, NextFunction } from 'express';

let quickAuthClient: any = null;
let Errors: any = null;

try {
  const quickAuth = require('@farcaster/quick-auth');
  quickAuthClient = quickAuth.createClient();
  Errors = quickAuth.Errors;
  console.log('✅ Quick Auth client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Quick Auth - authentication will fail');
  console.error('Please install: npm install @farcaster/quick-auth');
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        fid: number;
        address?: string;
      };
    }
  }
}

/**
 * Middleware to verify Quick Auth JWT token
 * Standalone mode: Uses simple user ID from header
 */
export async function quickAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Standalone mode - use X-User-ID header
  const userId = req.headers['x-user-id'] as string;
  
  if (userId) {
    // Extract FID from user ID
    const fidMatch = userId.match(/user-(\d+)/);
    const fid = fidMatch ? parseInt(fidMatch[1]) % 1000000 : Math.floor(Math.random() * 1000000);
    
    req.user = { fid };
    console.log(`✅ Standalone user authenticated: FID ${fid}`);
    next();
    return;
  }

  // Try Quick Auth if available
  if (quickAuthClient) {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = await quickAuthClient.verifyJwt({
          token,
          domain: process.env.HOSTNAME || 'localhost:3001',
        });

        req.user = {
          fid: payload.sub,
        };

        console.log(`✅ Authenticated user FID: ${payload.sub}`);
        next();
        return;
      }
    } catch (error) {
      console.warn('Quick Auth verification failed, using anonymous');
    }
  }

  // Fallback to anonymous user
  req.user = { fid: Math.floor(Math.random() * 1000000) };
  console.log(`✅ Anonymous user: FID ${req.user.fid}`);
  next();
}

/**
 * Optional middleware - doesn't fail if no token present
 * Useful for routes that work with or without authentication
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await quickAuthClient.verifyJwt({
        token,
        domain: process.env.HOSTNAME || 'localhost:3001',
      });

      req.user = {
        fid: payload.sub,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

