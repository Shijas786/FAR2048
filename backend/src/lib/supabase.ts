/**
 * Supabase Client Configuration
 * 
 * Creates and exports a Supabase client with service role key
 * for backend operations (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Make Supabase optional for local development
let supabase: any;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase environment variables not set - running in demo mode');
  console.warn('⚠️  Database features will not work. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env');
  // Create a mock client that won't crash but will return empty data
  supabase = null;
} else {
  // Create client with service role key (bypasses RLS)
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { supabase };

// Database types (auto-generated or manually defined)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          fid: number;
          username: string | null;
          display_name: string | null;
          pfp_url: string | null;
          wallet_address: string | null;
          total_winnings: number;
          total_wagered: number;
          matches_played: number;
          matches_won: number;
          highest_tile: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          match_number: number;
          contract_match_id: number | null;
          chain: 'base' | 'arbitrum';
          contract_address: string;
          wager_amount: number;
          max_players: number;
          status: 'open' | 'starting' | 'in_progress' | 'ended' | 'cancelled';
          current_players: number;
          total_pot: number;
          duration_seconds: number;
          winner_fid: number | null;
          winner_score: number | null;
          winner_highest_tile: number | null;
          platform_fee: number;
          payout_amount: number;
          payout_tx_hash: string | null;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
          host_fid: number;
          match_summary: string | null;
        };
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'match_number' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          fid: number;
          wallet_address: string;
          join_order: number;
          is_ready: boolean;
          score: number;
          highest_tile: number;
          moves_count: number;
          final_grid: any;
          join_tx_hash: string | null;
          joined_at: string;
          live_grid: any;
          last_move_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['match_players']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['match_players']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          match_id: string | null;
          fid: number | null;
          type: 'join' | 'payout' | 'refund' | 'fee';
          amount: number;
          chain: 'base' | 'arbitrum';
          tx_hash: string;
          from_address: string | null;
          to_address: string | null;
          status: 'pending' | 'confirmed' | 'failed';
          block_number: number | null;
          gas_used: number | null;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
    };
  };
}

