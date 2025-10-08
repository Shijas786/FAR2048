/**
 * Match Routes
 * 
 * Handles match creation, joining, listing, and management
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { quickAuthMiddleware, optionalAuthMiddleware } from '../middleware/quickAuth';
import { ApiError } from '../middleware/errorHandler';
import { z } from 'zod';
import { generateRoomCode, isValidRoomCode } from '../lib/roomCode';

const router = Router();

// Validation schemas
const createMatchSchema = z.object({
  chain: z.enum(['base', 'arbitrum']),
  wagerAmount: z.number().min(0), // Allow 0 for free play
  maxPlayers: z.number().min(2).max(4).default(4),
  contractMatchId: z.number().optional(),
  contractAddress: z.string(),
});

const joinMatchSchema = z.object({
  matchId: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(), // Optional for free play
});

const joinByCodeSchema = z.object({
  roomCode: z.string().length(6),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

/**
 * GET /api/matches
 * List all open matches (public)
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    // Return mock data if Supabase is not configured
    if (!supabase) {
      return res.json({ matches: [], total: 0 });
    }

    const status = req.query.status as string || 'open';
    const chain = req.query.chain as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    let query = supabase
      .from('matches')
      .select(`
        *,
        host:users!matches_host_fid_fkey(fid, username, display_name, pfp_url),
        match_players(
          fid,
          wallet_address,
          join_order,
          score,
          highest_tile,
          users(fid, username, display_name, pfp_url)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (chain) {
      query = query.eq('chain', chain);
    }

    const { data: matches, error } = await query;

    if (error) throw error;

    res.json({
      matches,
      count: matches?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id
 * Get specific match details (public)
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const { id } = req.params;

    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        host:users!matches_host_fid_fkey(fid, username, display_name, pfp_url),
        match_players(
          *,
          users(fid, username, display_name, pfp_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!match) throw new ApiError('Match not found', 404);

    res.json(match);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/create
 * Create a new match (authenticated)
 */
router.post('/create', quickAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    const validated = createMatchSchema.parse(req.body);
    const hostFid = req.user!.fid;
    let roomCode = generateRoomCode();
    let requiresApproval = validated.wagerAmount > 0;
    let isFreePlay = validated.wagerAmount === 0;

    // Return mock data if Supabase is not configured
    if (!supabase) {
      const mockMatch = {
        id: `mock-${Date.now()}`,
        room_code: roomCode,
        chain: validated.chain,
        wager_amount: validated.wagerAmount,
        max_players: validated.maxPlayers,
        contract_address: validated.contractAddress,
        host_fid: hostFid,
        status: 'open',
        current_players: 1,
        total_pot: validated.wagerAmount,
        duration_seconds: 120,
        requires_approval: requiresApproval,
        all_players_ready: isFreePlay,
        created_at: new Date().toISOString(),
      };
      return res.status(201).json(mockMatch);
    }

    // Get or create user
    await upsertUser(hostFid, req.body.userData);

    // Generate unique room code (roomCode already declared above)
    roomCode = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    // Ensure room code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('room_code', roomCode)
        .single();
      
      if (!existing) break; // Code is unique
      roomCode = generateRoomCode(); // Try again
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new ApiError('Failed to generate unique room code', 500);
    }

    // requiresApproval and isFreePlay already declared above

    // Create match in database
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        chain: validated.chain,
        wager_amount: validated.wagerAmount,
        max_players: validated.maxPlayers,
        contract_match_id: validated.contractMatchId || null,
        contract_address: validated.contractAddress,
        host_fid: hostFid,
        status: 'open',
        current_players: 0,
        total_pot: 0,
        duration_seconds: 120, // 2 minutes
        room_code: roomCode,
        requires_approval: requiresApproval,
        all_players_ready: isFreePlay, // Free play matches don't need approval
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(match);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/join
 * Join an existing match (authenticated)
 */
router.post('/join', quickAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const validated = joinMatchSchema.parse(req.body);
    const { matchId, walletAddress, txHash } = validated;
    const fid = req.user!.fid;

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*, match_players(fid)')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;
    if (!match) throw new ApiError('Match not found', 404);

    // Validation
    if (match.status !== 'open') {
      throw new ApiError('Match is not open for joining', 400);
    }

    if (match.current_players >= match.max_players) {
      throw new ApiError('Match is full', 400);
    }

    // Check if already joined
    const alreadyJoined = match.match_players?.some((p: any) => p.fid === fid);
    if (alreadyJoined) {
      throw new ApiError('Already joined this match', 400);
    }

    // Get or create user
    await upsertUser(fid, req.body.userData);

    // Add player to match
    const joinOrder = match.current_players + 1;

    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .insert({
        match_id: matchId,
        fid,
        wallet_address: walletAddress,
        join_order: joinOrder,
        join_tx_hash: txHash,
        is_ready: false,
        score: 0,
        highest_tile: 0,
        moves_count: 0,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Update match player count and pot
    const newPlayerCount = match.current_players + 1;
    const newTotalPot = match.total_pot + match.wager_amount;

    await supabase
      .from('matches')
      .update({
        current_players: newPlayerCount,
        total_pot: newTotalPot,
      })
      .eq('id', matchId);

    // Record transaction
    await supabase.from('transactions').insert({
      match_id: matchId,
      fid,
      type: 'join',
      amount: match.wager_amount,
      chain: match.chain,
      tx_hash: txHash,
      from_address: walletAddress,
      to_address: match.contract_address,
      status: 'confirmed',
    });

    // Broadcast update via Socket.IO
    const io = req.app.locals.io;
    if (io) {
      io.to(`match:${matchId}`).emit('player-joined', {
        fid,
        joinOrder,
        currentPlayers: newPlayerCount,
        totalPot: newTotalPot,
      });
    }

    res.status(201).json({
      player,
      match: {
        id: matchId,
        currentPlayers: newPlayerCount,
        totalPot: newTotalPot,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/players
 * Get players in a match
 */
router.get('/:id/players', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ players: [] });
    }

    const { id } = req.params;

    const { data: players, error } = await supabase
      .from('match_players')
      .select(`
        *,
        users(fid, username, display_name, pfp_url)
      `)
      .eq('match_id', id)
      .order('join_order');

    if (error) throw error;

    res.json({ players });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/join-by-code
 * Join a match using room code (authenticated)
 */
router.post('/join-by-code', quickAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    const validated = joinByCodeSchema.parse(req.body);
    const { roomCode, walletAddress } = validated;
    const fid = req.user!.fid;

    // Return mock success if Supabase is not configured
    if (!supabase) {
      const mockMatch = {
        id: `mock-match-${roomCode}`,
        room_code: roomCode.toUpperCase(),
        chain: 'base',
        wager_amount: 0,
        max_players: 4,
        current_players: 2,
        status: 'open',
      };
      
      // Broadcast to all players in the room
      const io = req.app.locals.io;
      if (io) {
        io.to(`match:${mockMatch.id}`).emit('player-joined', {
          player: { fid, wallet_address: walletAddress },
          currentPlayers: 2,
          totalPot: 0,
        });
      }
      
      return res.status(201).json({
        message: 'Joined match successfully (demo mode)',
        match: mockMatch,
        player: { fid, wallet_address: walletAddress },
      });
    }

    // Validate room code format
    if (!isValidRoomCode(roomCode.toUpperCase())) {
      throw new ApiError('Invalid room code format', 400);
    }

    // Find match by room code
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*, match_players(fid)')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (matchError || !match) {
      throw new ApiError('Room not found. Check your code and try again.', 404);
    }

    // Check if match is still open
    if (match.status !== 'open') {
      throw new ApiError('This room is no longer accepting players', 400);
    }

    // Check if room is full
    if (match.current_players >= match.max_players) {
      throw new ApiError('This room is full', 400);
    }

    // Check if player already joined
    const alreadyJoined = match.match_players?.some((p: any) => p.fid === fid);
    if (alreadyJoined) {
      throw new ApiError('You have already joined this room', 400);
    }

    // Get or create user
    await upsertUser(fid, req.body.userData);

    // Join the match
    const joinOrder = match.current_players + 1;
    const isFreePlay = match.wager_amount === 0;

    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .insert({
        match_id: match.id,
        fid,
        wallet_address: walletAddress,
        join_order: joinOrder,
        is_ready: false,
        has_approved: isFreePlay, // Auto-approve for free play
        approved_at: isFreePlay ? new Date().toISOString() : null,
        join_tx_hash: req.body.txHash || null,
      })
      .select()
      .single();

    if (playerError) throw playerError;

    // Update match player count
    const newPlayerCount = joinOrder;
    const newTotalPot = match.wager_amount * newPlayerCount;

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        current_players: newPlayerCount,
        total_pot: newTotalPot,
      })
      .eq('id', match.id);

    if (updateError) throw updateError;

    // Broadcast to all players in the room that someone joined
    const io = req.app.locals.io;
    if (io) {
      io.to(`match:${match.id}`).emit('player-joined', {
        player,
        currentPlayers: newPlayerCount,
        totalPot: newTotalPot,
      });
    }

    res.status(201).json({
      message: 'Joined match successfully',
      match: {
        ...match,
        current_players: newPlayerCount,
        total_pot: newTotalPot,
      },
      player,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/:id/approve
 * Approve the wager amount for a match (authenticated)
 */
router.post('/:id/approve', quickAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const fid = req.user!.fid;

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError) throw matchError;
    if (!match) throw new ApiError('Match not found', 404);

    // Check if match requires approval
    if (!match.requires_approval) {
      return res.json({ message: 'This match does not require approval' });
    }

    // Update player approval status
    const { error: updateError } = await supabase
      .from('match_players')
      .update({
        has_approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('match_id', id)
      .eq('fid', fid);

    if (updateError) throw updateError;

    // Check if all players have approved
    const { data: players, error: playersError } = await supabase
      .from('match_players')
      .select('has_approved')
      .eq('match_id', id);

    if (playersError) throw playersError;

    const allApproved = players?.every((p) => p.has_approved) ?? false;
    const allPlayersJoined = match.current_players === match.max_players;

    // Update match status if all players approved and room is full
    if (allApproved && allPlayersJoined) {
      await supabase
        .from('matches')
        .update({
          all_players_ready: true,
          status: 'starting', // Ready to start
        })
        .eq('id', id);

      // Notify via Socket.IO (handled by socket handlers)
      const io = req.app.locals.io;
      if (io) {
        io.to(id).emit('all-players-approved', { matchId: id });
      }
    }

    res.json({
      message: 'Approved successfully',
      allApproved,
      canStart: allApproved && allPlayersJoined,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper: Upsert user from Farcaster data
 */
async function upsertUser(fid: number, userData?: any) {
  const { error } = await supabase.from('users').upsert(
    {
      fid,
      username: userData?.username || null,
      display_name: userData?.displayName || null,
      pfp_url: userData?.pfpUrl || null,
      wallet_address: userData?.walletAddress || null,
    },
    { onConflict: 'fid' }
  );

  if (error) {
    console.error('Error upserting user:', error);
  }
}

export default router;

