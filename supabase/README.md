# FAR2048 Supabase Database

This directory contains the database schema and configuration for FAR2048.

## Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for the database to provision

### 2. Run Migration

1. Open the SQL Editor in your Supabase dashboard
2. Copy the entire contents of `schema.sql`
3. Paste and run it

### 3. Enable Realtime

For live game updates, enable Realtime on these tables:

1. Go to **Database** > **Replication**
2. Click **Manage** under "Realtime"
3. Enable for:
   - `matches`
   - `match_players`

### 4. Get Your Credentials

From **Settings** > **API**:

- `SUPABASE_URL`: Your project URL
- `SUPABASE_ANON_KEY`: Your anon/public key (for frontend)
- `SUPABASE_SERVICE_KEY`: Your service role key (for backend, keep secret!)

Add these to your `.env` files.

## Database Schema

### Core Tables

#### `users`
Stores Farcaster user profiles and stats
- Primary key: `id` (UUID)
- Unique key: `fid` (Farcaster ID)
- Tracks winnings, matches played, win rate

#### `matches`
Stores match information and state
- Primary key: `id` (UUID)
- Links to smart contract via `contract_match_id`
- Status: open → starting → in_progress → ended/cancelled
- Stores winner, pot, fees

#### `match_players`
Junction table for players in matches
- Links `matches` ↔ `users`
- Stores live game state (`live_grid`, `score`)
- Join order, readiness, performance stats

#### `transactions`
Blockchain transaction log
- Join transactions (player deposits)
- Payout transactions (winner receives)
- Refund transactions (cancelled matches)
- Fee transactions (platform revenue)

#### `game_moves` (Optional)
Individual move history for replays and analytics

### Views

#### `leaderboard`
Materialized view for fast leaderboard queries
- Ranked by total winnings
- Includes win rate and ROI
- Refresh with: `SELECT refresh_leaderboard();`

## Realtime Subscriptions

### Frontend Example

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to match updates
const channel = supabase
  .channel('match-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'matches',
      filter: `id=eq.${matchId}`
    },
    (payload) => {
      console.log('Match updated:', payload)
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'match_players',
      filter: `match_id=eq.${matchId}`
    },
    (payload) => {
      console.log('Player updated:', payload)
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

## Common Queries

### Get Open Matches

```sql
SELECT 
  m.*,
  u.username as host_username,
  u.pfp_url as host_pfp
FROM matches m
LEFT JOIN users u ON m.host_fid = u.fid
WHERE m.status = 'open'
  AND m.current_players < m.max_players
ORDER BY m.created_at DESC;
```

### Get Match with Players

```sql
SELECT 
  m.*,
  json_agg(
    json_build_object(
      'fid', mp.fid,
      'username', u.username,
      'pfp_url', u.pfp_url,
      'score', mp.score,
      'highest_tile', mp.highest_tile,
      'join_order', mp.join_order
    ) ORDER BY mp.join_order
  ) as players
FROM matches m
LEFT JOIN match_players mp ON m.id = mp.match_id
LEFT JOIN users u ON mp.fid = u.fid
WHERE m.id = $1
GROUP BY m.id;
```

### Get User Stats

```sql
SELECT 
  u.*,
  COUNT(DISTINCT mp.match_id) as total_matches,
  COUNT(DISTINCT CASE WHEN m.winner_fid = u.fid THEN m.id END) as wins,
  COALESCE(SUM(CASE WHEN m.winner_fid = u.fid THEN m.payout_amount ELSE 0 END), 0) as total_won
FROM users u
LEFT JOIN match_players mp ON u.fid = mp.fid
LEFT JOIN matches m ON mp.match_id = m.id AND m.status = 'ended'
WHERE u.fid = $1
GROUP BY u.id;
```

### Top 10 Leaderboard

```sql
SELECT * FROM leaderboard
ORDER BY total_winnings DESC
LIMIT 10;
```

## Backend Integration

### Using Supabase Client (Node.js)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key in backend
)

// Create or update user
async function upsertUser(fid: number, userData: any) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        fid,
        username: userData.username,
        display_name: userData.displayName,
        pfp_url: userData.pfpUrl,
        wallet_address: userData.walletAddress,
      },
      { onConflict: 'fid' }
    )
    .select()
    .single()

  return { data, error }
}

// Create match
async function createMatch(matchData: any) {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      contract_match_id: matchData.contractMatchId,
      chain: matchData.chain,
      wager_amount: matchData.wagerAmount,
      host_fid: matchData.hostFid,
      contract_address: matchData.contractAddress,
    })
    .select()
    .single()

  return { data, error }
}

// Update live game state
async function updatePlayerGrid(matchId: string, fid: number, gridState: any) {
  const { error } = await supabase
    .from('match_players')
    .update({
      live_grid: gridState,
      score: calculateScore(gridState),
      highest_tile: getHighestTile(gridState),
      last_move_at: new Date().toISOString(),
    })
    .match({ match_id: matchId, fid })

  return { error }
}
```

## Maintenance

### Refresh Leaderboard

Set up a cron job (or use pg_cron):

```sql
-- Refresh every 5 minutes
SELECT cron.schedule(
  'refresh-leaderboard',
  '*/5 * * * *',
  'SELECT refresh_leaderboard();'
);
```

### Backup Database

Use Supabase's built-in backup features or pg_dump:

```bash
pg_dump "postgresql://[YOUR_CONNECTION_STRING]" > backup.sql
```

### Monitor Performance

- Check slow queries in Supabase dashboard
- Add indexes as needed for your query patterns
- Monitor table sizes and consider partitioning for large tables

## Security

### Row Level Security (RLS)

Current policies:
- **Read**: Public access for all tables (needed for leaderboards)
- **Write**: Only service role (backend) can write

To restrict further, modify RLS policies in `schema.sql`.

### Best Practices

1. **Never expose service key** in frontend
2. Use anon key for frontend, service key for backend
3. Enable RLS on all tables
4. Validate all inputs in backend before database writes
5. Use prepared statements to prevent SQL injection

## Troubleshooting

### Realtime not working

1. Check if realtime is enabled for the table
2. Verify subscription code is correct
3. Check Supabase project region (latency)
4. Monitor realtime connections in dashboard

### Slow queries

1. Check EXPLAIN ANALYZE output
2. Add appropriate indexes
3. Consider materialized views for complex queries
4. Use connection pooling (built into Supabase)

### Migration errors

1. Ensure UUID extension is enabled
2. Run schema in order (tables, then views, then functions)
3. Check for naming conflicts
4. Verify Postgres version compatibility

## Support

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

