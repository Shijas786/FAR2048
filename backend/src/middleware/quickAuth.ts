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
 * Expects: Authorization: Bearer <token>
 */
export async function quickAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!quickAuthClient) {
    console.error('❌ Quick Auth not initialized - authentication required');
    res.status(503).json({ 
      error: 'Authentication service unavailable',
      message: 'Quick Auth is not properly configured on the server'
    });
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT with Quick Auth client
    const payload = await quickAuthClient.verifyJwt({
      token,
      domain: process.env.HOSTNAME || 'localhost:3001',
    });

    // Attach user info to request
    req.user = {
      fid: payload.sub, // FID is in the 'sub' field
    };

    console.log(`✅ Authenticated user FID: ${payload.sub}`);
    next();
  } catch (error) {
    if (Errors && error instanceof Errors.InvalidTokenError) {
      console.warn('Invalid Quick Auth token:', error.message);
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is invalid or expired'
      });
      return;
    }

    console.error('Quick Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Failed to verify authentication token'
    });
  }
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

