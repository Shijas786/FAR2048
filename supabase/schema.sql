-- FAR2048 Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores Farcaster user information and stats
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fid BIGINT UNIQUE NOT NULL,  -- Farcaster ID
    username TEXT,  -- Farcaster username
    display_name TEXT,
    pfp_url TEXT,  -- Profile picture URL
    wallet_address TEXT,  -- Primary wallet address
    total_winnings DECIMAL(20, 6) DEFAULT 0,  -- Total USDC won
    total_wagered DECIMAL(20, 6) DEFAULT 0,  -- Total USDC wagered
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    highest_tile INTEGER DEFAULT 0,  -- Best tile achieved
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast FID lookups
CREATE INDEX idx_users_fid ON users(fid);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- ============================================
-- MATCHES TABLE
-- ============================================
-- Stores match information
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_number SERIAL UNIQUE,  -- Auto-incrementing match number
    contract_match_id BIGINT,  -- ID from smart contract
    chain TEXT NOT NULL CHECK (chain IN ('base', 'arbitrum')),  -- blockchain
    contract_address TEXT NOT NULL,  -- Smart contract address
    
    -- Match settings
    wager_amount DECIMAL(20, 6) NOT NULL,  -- USDC per player
    max_players INTEGER DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
    
    -- Match state
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'starting', 'in_progress', 'ended', 'cancelled')),
    current_players INTEGER DEFAULT 0,
    total_pot DECIMAL(20, 6) DEFAULT 0,
    
    -- Game data
    duration_seconds INTEGER DEFAULT 120,  -- 2 minutes
    
    -- Winner info
    winner_fid BIGINT REFERENCES users(fid),
    winner_score INTEGER,
    winner_highest_tile INTEGER,
    
    -- Financial
    platform_fee DECIMAL(20, 6) DEFAULT 0,
    payout_amount DECIMAL(20, 6) DEFAULT 0,
    payout_tx_hash TEXT,  -- Transaction hash of winner payout
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    -- Host info
    host_fid BIGINT REFERENCES users(fid),
    
    -- AI-generated match summary (optional)
    match_summary TEXT
);

-- Indexes for queries
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_chain ON matches(chain);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_winner ON matches(winner_fid);
CREATE INDEX idx_matches_contract_id ON matches(contract_match_id);

-- ============================================
-- MATCH_PLAYERS TABLE
-- ============================================
-- Junction table for players in matches
CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    fid BIGINT NOT NULL REFERENCES users(fid),
    
    -- Player state
    wallet_address TEXT NOT NULL,
    join_order INTEGER NOT NULL,  -- Order they joined (1-4)
    is_ready BOOLEAN DEFAULT FALSE,
    
    -- Game performance
    score INTEGER DEFAULT 0,
    highest_tile INTEGER DEFAULT 0,
    moves_count INTEGER DEFAULT 0,
    
    -- Grid state (JSON snapshot of final board)
    final_grid JSONB,
    
    -- Transaction info
    join_tx_hash TEXT,  -- Transaction hash when joined
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Real-time game state (updated during match)
    live_grid JSONB,  -- Current grid state during game
    last_move_at TIMESTAMPTZ,
    
    UNIQUE(match_id, fid)  -- Player can only join once per match
);

-- Indexes
CREATE INDEX idx_match_players_match ON match_players(match_id);
CREATE INDEX idx_match_players_fid ON match_players(fid);
CREATE INDEX idx_match_players_score ON match_players(score DESC);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
-- Stores all blockchain transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    fid BIGINT REFERENCES users(fid),
    
    -- Transaction details
    type TEXT NOT NULL CHECK (type IN ('join', 'payout', 'refund', 'fee')),
    amount DECIMAL(20, 6) NOT NULL,
    chain TEXT NOT NULL CHECK (chain IN ('base', 'arbitrum')),
    tx_hash TEXT NOT NULL UNIQUE,
    
    -- Address info
    from_address TEXT,
    to_address TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    block_number BIGINT,
    gas_used BIGINT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_transactions_match ON transactions(match_id);
CREATE INDEX idx_transactions_fid ON transactions(fid);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_type ON transactions(type);

-- ============================================
-- GAME_MOVES TABLE (Optional - for replay/analytics)
-- ============================================
-- Stores individual moves for match replay
CREATE TABLE IF NOT EXISTS game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    fid BIGINT NOT NULL REFERENCES users(fid),
    
    -- Move data
    move_number INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('up', 'down', 'left', 'right')),
    score_delta INTEGER,  -- Points gained from this move
    
    -- Grid snapshot after move
    grid_state JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(match_id, fid, move_number)
);

-- Index for move replay
CREATE INDEX idx_game_moves_match_fid ON game_moves(match_id, fid, move_number);

-- ============================================
-- LEADERBOARD VIEW
-- ============================================
-- Materialized view for fast leaderboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT 
    u.fid,
    u.username,
    u.display_name,
    u.pfp_url,
    u.total_winnings,
    u.total_wagered,
    u.matches_played,
    u.matches_won,
    u.highest_tile,
    CASE 
        WHEN u.matches_played > 0 
        THEN ROUND((u.matches_won::DECIMAL / u.matches_played::DECIMAL) * 100, 2)
        ELSE 0 
    END as win_rate,
    CASE 
        WHEN u.total_wagered > 0 
        THEN ROUND(((u.total_winnings - u.total_wagered) / u.total_wagered) * 100, 2)
        ELSE 0 
    END as roi_percent
FROM users u
WHERE u.matches_played > 0
ORDER BY u.total_winnings DESC;

-- Index on materialized view
CREATE UNIQUE INDEX idx_leaderboard_fid ON leaderboard(fid);

-- Refresh leaderboard function (call this periodically)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update user stats after match ends
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all players in the match
    UPDATE users u
    SET 
        matches_played = matches_played + 1,
        matches_won = matches_won + CASE WHEN u.fid = NEW.winner_fid THEN 1 ELSE 0 END,
        total_wagered = total_wagered + NEW.wager_amount,
        total_winnings = total_winnings + CASE 
            WHEN u.fid = NEW.winner_fid THEN NEW.payout_amount 
            ELSE 0 
        END,
        highest_tile = GREATEST(u.highest_tile, COALESCE(
            (SELECT mp.highest_tile FROM match_players mp 
             WHERE mp.match_id = NEW.id AND mp.fid = u.fid), 0
        )),
        updated_at = NOW()
    WHERE u.fid IN (
        SELECT fid FROM match_players WHERE match_id = NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when match ends
CREATE TRIGGER trigger_update_user_stats
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (NEW.status = 'ended' AND OLD.status != 'ended')
EXECUTE FUNCTION update_user_stats();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Public read access for leaderboards and match listings
CREATE POLICY "Public read access for users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Public read access for matches"
    ON matches FOR SELECT
    USING (true);

CREATE POLICY "Public read access for match_players"
    ON match_players FOR SELECT
    USING (true);

CREATE POLICY "Public read access for transactions"
    ON transactions FOR SELECT
    USING (true);

-- Service role can do everything (for backend)
-- Set up service role policies in Supabase dashboard

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================

-- Enable Realtime for live game updates
-- Run these commands in Supabase dashboard or via Supabase CLI:
-- 
-- ALTER PUBLICATION supabase_realtime ADD TABLE matches;
-- ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
-- 
-- Or enable via dashboard: Database > Replication > Enable realtime for tables

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Create a test user
-- INSERT INTO users (fid, username, display_name, wallet_address)
-- VALUES (1, 'testuser', 'Test User', '0x0000000000000000000000000000000000000001')
-- ON CONFLICT (fid) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_matches_status_created ON matches(status, created_at DESC);
CREATE INDEX idx_match_players_match_score ON match_players(match_id, score DESC);

-- ============================================
-- NOTES
-- ============================================

/*
After running this schema:

1. Enable Realtime in Supabase Dashboard:
   - Go to Database > Replication
   - Enable realtime for: matches, match_players

2. Set up Row Level Security policies for your service role

3. Create a scheduled job to refresh leaderboard:
   - Go to Database > Functions
   - Create a pg_cron job to run refresh_leaderboard() every 5 minutes

4. Optional: Set up database backups

5. Grant necessary permissions to your service role key

To refresh leaderboard manually:
SELECT refresh_leaderboard();

*/

