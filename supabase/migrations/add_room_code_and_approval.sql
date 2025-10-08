-- ============================================
-- Migration: Add Room Code and Player Approval System
-- ============================================

-- Add room_code to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS all_players_ready BOOLEAN DEFAULT FALSE;

-- Create index for room code lookups
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches(room_code) WHERE room_code IS NOT NULL;

-- Add approval status to match_players table
ALTER TABLE match_players
ADD COLUMN IF NOT EXISTS has_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update existing matches to have room codes (for testing)
-- This generates a 6-character alphanumeric code
UPDATE matches 
SET room_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
WHERE room_code IS NULL AND status = 'open';

-- Comments
COMMENT ON COLUMN matches.room_code IS 'Unique 6-character room code for joining';
COMMENT ON COLUMN matches.requires_approval IS 'Whether players must approve wager before game starts';
COMMENT ON COLUMN matches.all_players_ready IS 'True when all players have approved';
COMMENT ON COLUMN match_players.has_approved IS 'Whether player has approved the wager amount';
COMMENT ON COLUMN match_players.approved_at IS 'Timestamp when player approved';

