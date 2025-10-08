/**
 * Webhook Routes
 * 
 * Handles blockchain events and admin operations
 * These should be secured with API keys or signatures in production
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { declareWinnerOnChain, waitForTransaction } from '../lib/blockchain';
import { ApiError } from '../middleware/errorHandler';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * POST /api/webhooks/declare-winner
 * Declare winner on blockchain and finalize match
 * Should be called after match ends via Socket.IO
 */
router.post('/declare-winner', async (req: Request, res: Response, next) => {
  try {
    const { matchId } = req.body;

    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        match_players(
          *,
          users(fid, username, display_name)
        )
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new ApiError('Match not found', 404);
    }

    if (match.status !== 'ended') {
      throw new ApiError('Match has not ended yet', 400);
    }

    if (!match.winner_fid) {
      throw new ApiError('No winner declared', 400);
    }

    // Get winner wallet address
    const winnerPlayer = match.match_players.find(
      (p: any) => p.fid === match.winner_fid
    );

    if (!winnerPlayer || !winnerPlayer.wallet_address) {
      throw new ApiError('Winner wallet address not found', 400);
    }

    // Only declare if contract_match_id exists
    if (!match.contract_match_id) {
      throw new ApiError('No contract match ID', 400);
    }

    // Declare winner on blockchain
    const txHash = await declareWinnerOnChain(
      match.chain,
      BigInt(match.contract_match_id),
      winnerPlayer.wallet_address
    );

    // Wait for confirmation
    const receipt = await waitForTransaction(match.chain, txHash as `0x${string}`);

    // Calculate payout (total pot minus platform fee)
    const platformFeePercent = 1; // 1%
    const platformFee = match.total_pot * (platformFeePercent / 100);
    const payoutAmount = match.total_pot - platformFee;

    // Update match with payout info
    await supabase
      .from('matches')
      .update({
        payout_tx_hash: txHash,
        platform_fee: platformFee,
        payout_amount: payoutAmount,
      })
      .eq('id', matchId);

    // Record payout transaction
    await supabase.from('transactions').insert({
      match_id: matchId,
      fid: match.winner_fid,
      type: 'payout',
      amount: payoutAmount,
      chain: match.chain,
      tx_hash: txHash,
      from_address: match.contract_address,
      to_address: winnerPlayer.wallet_address,
      status: 'confirmed',
      block_number: Number(receipt.blockNumber),
    });

    // Generate AI match summary (optional)
    if (openai) {
      try {
        const summary = await generateMatchSummary(match);
        await supabase
          .from('matches')
          .update({ match_summary: summary })
          .eq('id', matchId);
      } catch (aiError) {
        console.error('Failed to generate AI summary:', aiError);
        // Don't fail the whole operation
      }
    }

    res.json({
      success: true,
      txHash,
      payoutAmount,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/transaction-confirmed
 * Webhook to handle blockchain transaction confirmations
 * Could be called by blockchain indexer like Alchemy/QuickNode webhooks
 */
router.post('/transaction-confirmed', async (req: Request, res: Response, next) => {
  try {
    const { txHash, blockNumber, status } = req.body;

    // Update transaction status
    const { error } = await supabase
      .from('transactions')
      .update({
        status: status === 'success' ? 'confirmed' : 'failed',
        block_number: blockNumber,
        confirmed_at: new Date().toISOString(),
      })
      .eq('tx_hash', txHash);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate AI match summary using OpenAI
 */
async function generateMatchSummary(match: any): Promise<string> {
  if (!openai) return '';

  const players = match.match_players
    .map(
      (p: any) =>
        `@${p.users?.username || p.fid} - Score: ${p.score}, Highest Tile: ${p.highest_tile}`
    )
    .join(', ');

  const winner = match.match_players.find((p: any) => p.fid === match.winner_fid);
  const winnerName = winner?.users?.username || winner?.fid || 'Unknown';

  const prompt = `Generate a fun, short (1-2 sentences) summary of this 2048 battle game match. 
Be creative and playful, like a sports commentator. Include the winner's achievement.

Winner: @${winnerName}
Winning Tile: ${match.winner_highest_tile}
Winning Score: ${match.winner_score}
Total Pot: ${match.total_pot} USDC
Players: ${players}

Example: "@alice dominated the board with a legendary 2048 tile, crushing @bob's dreams and taking home $40 USDC! 🔥"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.8,
  });

  return completion.choices[0]?.message?.content || '';
}

export default router;

