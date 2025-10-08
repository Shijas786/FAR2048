/**
 * Leaderboard Routes
 * 
 * Handles leaderboard queries and rankings
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/leaderboard
 * Get top players by various metrics
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ leaderboard: [], count: 0, limit: 100, offset: 0, sortBy: 'total_winnings' });
    }

    const sortBy = (req.query.sortBy as string) || 'total_winnings';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Use materialized view for performance
    const { data: leaderboard, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order(sortBy as any, { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      leaderboard,
      count: leaderboard?.length || 0,
      limit,
      offset,
      sortBy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard/top/:metric
 * Get top N players by specific metric
 */
router.get('/top/:metric', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ topPlayers: [] });
    }

    const { metric } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const validMetrics = [
      'total_winnings',
      'matches_won',
      'win_rate',
      'highest_tile',
      'roi_percent',
    ];

    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric' });
    }

    const { data: topPlayers, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order(metric as any, { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      metric,
      topPlayers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard/rank/:fid
 * Get specific user's rank
 */
router.get('/rank/:fid', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ rank: null, user: null });
    }

    const fid = parseInt(req.params.fid);

    if (isNaN(fid)) {
      return res.status(400).json({ error: 'Invalid FID' });
    }

    // Get user from leaderboard
    const { data: user, error: userError } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('fid', fid)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found in leaderboard' });
    }

    // Calculate rank by total winnings
    const { count: rank } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('total_winnings', user.total_winnings);

    res.json({
      ...user,
      rank: (rank || 0) + 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard/recent-winners
 * Get recent match winners
 */
router.get('/recent-winners', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ winners: [] });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const { data: recentMatches, error } = await supabase
      .from('matches')
      .select(`
        id,
        ended_at,
        payout_amount,
        winner_score,
        winner_highest_tile,
        chain,
        winner:users!matches_winner_fid_fkey(fid, username, display_name, pfp_url)
      `)
      .eq('status', 'ended')
      .not('winner_fid', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      recentWinners: recentMatches,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/leaderboard/refresh
 * Manually refresh leaderboard materialized view
 * (Could be protected with admin auth)
 */
router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    if (!supabase) {
      return res.json({ message: 'Leaderboard refresh skipped (no database)' });
    }

    // Call the refresh function
    const { error } = await supabase.rpc('refresh_leaderboard');

    if (error) throw error;

    res.json({ success: true, message: 'Leaderboard refreshed' });
  } catch (error) {
    next(error);
  }
});

export default router;

