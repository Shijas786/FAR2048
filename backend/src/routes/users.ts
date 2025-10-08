/**
 * User Routes
 * 
 * Handles user profiles and stats
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { quickAuthMiddleware } from '../middleware/quickAuth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/users/:fid
 * Get user profile and stats (public)
 */
router.get('/:fid', async (req: Request, res: Response, next) => {
  try {
    const fid = parseInt(req.params.fid);

    if (isNaN(fid)) {
      throw new ApiError('Invalid FID', 400);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('fid', fid)
      .single();

    if (error || !user) {
      throw new ApiError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:fid/matches
 * Get user's match history
 */
router.get('/:fid/matches', async (req: Request, res: Response, next) => {
  try {
    const fid = parseInt(req.params.fid);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(fid)) {
      throw new ApiError('Invalid FID', 400);
    }

    // Get matches where user is a player
    const { data: matchPlayers, error } = await supabase
      .from('match_players')
      .select(`
        *,
        matches(
          *,
          host:users!matches_host_fid_fkey(fid, username, display_name, pfp_url)
        )
      `)
      .eq('fid', fid)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform to include match details
    const matches = matchPlayers?.map((mp: any) => ({
      ...mp.matches,
      playerData: {
        score: mp.score,
        highestTile: mp.highest_tile,
        joinOrder: mp.join_order,
        isWinner: mp.matches.winner_fid === fid,
      },
    }));

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
 * GET /api/users/:fid/stats
 * Get detailed user statistics
 */
router.get('/:fid/stats', async (req: Request, res: Response, next) => {
  try {
    const fid = parseInt(req.params.fid);

    if (isNaN(fid)) {
      throw new ApiError('Invalid FID', 400);
    }

    // Get user basic stats
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('fid', fid)
      .single();

    if (userError || !user) {
      throw new ApiError('User not found', 404);
    }

    // Get additional computed stats
    const { data: recentMatches } = await supabase
      .from('match_players')
      .select('score, highest_tile, matches!inner(ended_at, winner_fid)')
      .eq('fid', fid)
      .not('matches.ended_at', 'is', null)
      .order('matches(ended_at)', { ascending: false } as any)
      .limit(10);

    // Calculate average score
    const avgScore =
      recentMatches && recentMatches.length > 0
        ? recentMatches.reduce((sum: number, m: any) => sum + (m.score || 0), 0) / recentMatches.length
        : 0;

    // Calculate win rate
    const winRate =
      user.matches_played > 0 ? (user.matches_won / user.matches_played) * 100 : 0;

    // Calculate ROI
    const roi =
      user.total_wagered > 0
        ? ((user.total_winnings - user.total_wagered) / user.total_wagered) * 100
        : 0;

    res.json({
      ...user,
      computed: {
        avgScore: Math.round(avgScore),
        winRate: Math.round(winRate * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        netProfit: user.total_winnings - user.total_wagered,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me
 * Update authenticated user's profile
 */
router.put('/me', quickAuthMiddleware, async (req: Request, res: Response, next) => {
  try {
    const fid = req.user!.fid;
    const { username, displayName, pfpUrl, walletAddress } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        username: username || undefined,
        display_name: displayName || undefined,
        pfp_url: pfpUrl || undefined,
        wallet_address: walletAddress || undefined,
      })
      .eq('fid', fid)
      .select()
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;

