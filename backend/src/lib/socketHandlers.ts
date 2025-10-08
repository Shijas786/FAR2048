/**
 * Socket.IO Event Handlers
 * 
 * Handles real-time game state synchronization for multiplayer 2048
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabase } from './supabase';

interface GameMove {
  matchId: string;
  fid: number;
  direction: 'up' | 'down' | 'left' | 'right';
  gridState: number[][];
  score: number;
  highestTile: number;
  movesCount: number;
}

interface PlayerReady {
  matchId: string;
  fid: number;
  isReady: boolean;
}

/**
 * Setup Socket.IO event handlers
 */
export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Join match room
    socket.on('join-match', async (matchId: string) => {
      try {
        socket.join(`match:${matchId}`);
        console.log(`Player joined match room: match:${matchId}`);

        // Send current match state
        if (!supabase) {
          // Demo mode - send mock match state
          const mockMatch = {
            id: matchId,
            status: 'open',
            current_players: 2,
            max_players: 4,
            wager_amount: 0,
            chain: 'base',
            match_players: [
              { fid: 1, is_ready: false, score: 0, highest_tile: 0 },
              { fid: 2, is_ready: false, score: 0, highest_tile: 0 },
            ],
          };
          socket.emit('match-state', mockMatch);
        } else {
          const { data: match } = await supabase
            .from('matches')
            .select('*, match_players(*)')
            .eq('id', matchId)
            .single();

          if (match) {
            socket.emit('match-state', match);
          }
        }
      } catch (error) {
        console.error('Error joining match:', error);
        socket.emit('error', { message: 'Failed to join match' });
      }
    });

    // Leave match room
    socket.on('leave-match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
      console.log(`Player left match room: match:${matchId}`);
    });

    // Player ready status
    socket.on('player-ready', async (data: PlayerReady) => {
      try {
        const { matchId, fid, isReady } = data;

        // Broadcast to all players in match
        io.to(`match:${matchId}`).emit('player-ready-update', {
          fid,
          isReady,
        });

        if (!supabase) {
          // Demo mode - simulate match start after 2 players ready
          console.log(`Player ${fid} ready in demo mode`);
          io.to(`match:${matchId}`).emit('match-starting', { countdown: 3 });
          
          setTimeout(() => {
            io.to(`match:${matchId}`).emit('match-started', {
              startTime: Date.now(),
              duration: 120,
            });
          }, 3000);
          return;
        }

        // Update player ready status in database
        await supabase
          .from('match_players')
          .update({ is_ready: isReady })
          .match({ match_id: matchId, fid });

        // Check if all players are ready
        const { data: players } = await supabase
          .from('match_players')
          .select('is_ready')
          .eq('match_id', matchId);

        const allReady = players?.every((p: any) => p.is_ready);

        if (allReady && players && players.length >= 2) {
          // Start match countdown
          io.to(`match:${matchId}`).emit('match-starting', {
            countdown: 5, // 5 second countdown
          });

          // Update match status to starting
          await supabase
            .from('matches')
            .update({ status: 'starting' })
            .eq('id', matchId);

          // After countdown, start match
          setTimeout(async () => {
            await supabase
              .from('matches')
              .update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
              })
              .eq('id', matchId);

            io.to(`match:${matchId}`).emit('match-started', {
              startTime: new Date().toISOString(),
            });

            // Start match timer (2 minutes)
            startMatchTimer(io, matchId, 120000); // 120 seconds
          }, 5000);
        }
      } catch (error) {
        console.error('Error handling player ready:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Game move (player makes a move in their 2048 grid)
    socket.on('game-move', async (data: GameMove) => {
      try {
        const { matchId, fid, direction, gridState, score, highestTile, movesCount } = data;

        console.log('🎮 Game move received:', {
          matchId,
          fid,
          direction,
          hasGridState: !!gridState,
          score,
          highestTile
        });

        // Broadcast move to all players in match (for spectators and UI updates)
        const moveData = {
          fid,
          direction,
          gridState, // Include grid state for mini grids!
          score,
          highestTile,
          movesCount,
        };

        console.log('📡 Broadcasting player-move to match room:', `match:${matchId}`, moveData);
        io.to(`match:${matchId}`).emit('player-move', moveData);

        // Update database only if Supabase is available
        if (supabase) {
          await supabase
            .from('match_players')
            .update({
              live_grid: gridState,
              score,
              highest_tile: highestTile,
              moves_count: movesCount,
              last_move_at: new Date().toISOString(),
            })
            .match({ match_id: matchId, fid });
        }

        // Check for win condition (reached 2048 tile during match)
        if (highestTile >= 2048) {
          io.to(`match:${matchId}`).emit('player-milestone', {
            fid,
            tile: highestTile,
          });
        }
      } catch (error) {
        console.error('Error handling game move:', error);
        socket.emit('error', { message: 'Failed to update game state' });
      }
    });

    // Spectator join
    socket.on('spectate-match', (matchId: string) => {
      socket.join(`match:${matchId}`);
      console.log(`Spectator joined match: match:${matchId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
}

/**
 * Start match timer and end match after duration
 */
async function startMatchTimer(io: SocketIOServer, matchId: string, durationMs: number) {
  // Send periodic time updates
  const interval = setInterval(() => {
    // This would ideally track remaining time
    // For simplicity, we just end after duration
  }, 1000);

  // End match after duration
  setTimeout(async () => {
    clearInterval(interval);

    try {
      // Get all players and their scores
      const { data: players } = await supabase
        .from('match_players')
        .select('fid, wallet_address, score, highest_tile, live_grid')
        .eq('match_id', matchId)
        .order('highest_tile', { ascending: false });

      if (!players || players.length === 0) {
        console.error('No players found for match:', matchId);
        return;
      }

      // Winner is player with highest tile, then highest score
      const winner = players.reduce((prev: any, current: any) => {
        if (current.highest_tile > prev.highest_tile) return current;
        if (current.highest_tile === prev.highest_tile && current.score > prev.score) return current;
        return prev;
      });

      // Update match as ended
      const { data: match } = await supabase
        .from('matches')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winner_fid: winner.fid,
          winner_score: winner.score,
          winner_highest_tile: winner.highest_tile,
        })
        .eq('id', matchId)
        .select()
        .single();

      if (!match) {
        console.error('Failed to update match:', matchId);
        return;
      }

      // Save final grids
      for (const player of players) {
        await supabase
          .from('match_players')
          .update({ final_grid: player.live_grid })
          .match({ match_id: matchId, fid: player.fid });
      }

      // Emit match ended event
      io.to(`match:${matchId}`).emit('match-ended', {
        winnerFid: winner.fid,
        winnerScore: winner.score,
        winnerTile: winner.highest_tile,
        players: players.map((p: any) => ({
          fid: p.fid,
          score: p.score,
          highestTile: p.highest_tile,
        })),
      });

      // Trigger smart contract winner declaration (imported in routes/webhooks.ts)
      console.log(`🏆 Match ${matchId} ended. Winner: FID ${winner.fid}`);

      // Note: Smart contract declareWinner should be called from a secure webhook
      // or admin endpoint, not automatically here (to prevent manipulation)
    } catch (error) {
      console.error('Error ending match:', error);
    }
  }, durationMs);
}

/**
 * Broadcast match update to all participants
 */
export function broadcastMatchUpdate(io: SocketIOServer, matchId: string, data: any) {
  io.to(`match:${matchId}`).emit('match-update', data);
}

