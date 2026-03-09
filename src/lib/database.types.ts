// Minimal Supabase database types for the Jito Cabal platform
// In production, generate these with: npx supabase gen types typescript

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          wallet_address: string;
          x_user_id: string | null;
          x_handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          total_xp: number;
          current_streak: number;
          longest_streak: number;
          last_submission_date: string | null;
          is_holder: boolean;
          nft_mint_address: string | null;
          badges: unknown[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          wallet_address: string;
          x_user_id: string | null;
          x_handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          total_xp: number;
          current_streak: number;
          longest_streak: number;
          last_submission_date: string | null;
          is_holder: boolean;
          nft_mint_address: string | null;
          badges: unknown[];
          created_at: string;
          updated_at: string;
        }> & { wallet_address: string };
        Update: Partial<{
          wallet_address: string;
          x_user_id: string | null;
          x_handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          total_xp: number;
          current_streak: number;
          longest_streak: number;
          last_submission_date: string | null;
          is_holder: boolean;
          nft_mint_address: string | null;
          badges: unknown[];
          updated_at: string;
        }>;
      };
      submissions: {
        Row: {
          id: string;
          wallet_address: string;
          type: string;
          url: string | null;
          image_path: string | null;
          title: string;
          content_text: string;
          raw_score: number | null;
          normalized_score: number | null;
          scoring_breakdown: Record<string, unknown> | null;
          points_awarded: number;
          x_metrics: Record<string, unknown> | null;
          status: string;
          week_number: number;
          created_at: string;
          scored_at: string | null;
        };
        Insert: Partial<{
          id: string;
          wallet_address: string;
          type: string;
          url: string | null;
          image_path: string | null;
          title: string;
          content_text: string;
          raw_score: number | null;
          normalized_score: number | null;
          scoring_breakdown: Record<string, unknown> | null;
          points_awarded: number;
          x_metrics: Record<string, unknown> | null;
          status: string;
          week_number: number;
          created_at: string;
          scored_at: string | null;
        }> & { wallet_address: string; type: string; title: string; content_text: string; week_number: number };
        Update: Partial<{
          type: string;
          url: string | null;
          image_path: string | null;
          title: string;
          content_text: string;
          raw_score: number | null;
          normalized_score: number | null;
          scoring_breakdown: Record<string, unknown> | null;
          points_awarded: number;
          x_metrics: Record<string, unknown> | null;
          status: string;
          scored_at: string | null;
        }>;
      };
      reactions: {
        Row: {
          id: string;
          submission_id: string;
          wallet_address: string;
          type: string;
          created_at: string;
        };
        Insert: Partial<{
          id: string;
          submission_id: string;
          wallet_address: string;
          type: string;
          created_at: string;
        }> & { submission_id: string; wallet_address: string; type: string };
        Update: Partial<{
          type: string;
        }>;
      };
      weekly_snapshots: {
        Row: {
          id: string;
          week_number: number;
          year: number;
          entries: unknown;
          total_submissions: number;
          total_points_distributed: number;
          snapshot_date: string;
        };
        Insert: Partial<{
          id: string;
          week_number: number;
          year: number;
          entries: unknown;
          total_submissions: number;
          total_points_distributed: number;
          snapshot_date: string;
        }> & { week_number: number; year: number; entries: unknown };
        Update: Partial<{
          entries: unknown;
          total_submissions: number;
          total_points_distributed: number;
        }>;
      };
      rewards: {
        Row: {
          id: string;
          wallet_address: string;
          week_number: number;
          points_earned: number;
          reward_amount_lamports: number;
          status: string;
          claimed_at: string | null;
          tx_signature: string | null;
          created_at: string;
        };
        Insert: Partial<{
          id: string;
          wallet_address: string;
          week_number: number;
          points_earned: number;
          reward_amount_lamports: number;
          status: string;
          claimed_at: string | null;
          tx_signature: string | null;
          created_at: string;
        }> & { wallet_address: string; week_number: number; points_earned: number };
        Update: Partial<{
          reward_amount_lamports: number;
          status: string;
          claimed_at: string | null;
          tx_signature: string | null;
        }>;
      };
      quests: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: string;
          requirements: string;
          bonus_multiplier: number;
          points_reward: number;
          status: string;
          starts_at: string;
          expires_at: string;
        };
        Insert: Partial<{
          id: string;
          title: string;
          description: string;
          type: string;
          requirements: string;
          bonus_multiplier: number;
          points_reward: number;
          status: string;
          starts_at: string;
          expires_at: string;
        }> & { title: string; description: string; type: string; requirements: string; expires_at: string };
        Update: Partial<{
          title: string;
          description: string;
          status: string;
        }>;
      };
      quest_progress: {
        Row: {
          id: string;
          quest_id: string;
          wallet_address: string;
          progress: number;
          target: number;
          completed_at: string | null;
        };
        Insert: Partial<{
          id: string;
          quest_id: string;
          wallet_address: string;
          progress: number;
          target: number;
          completed_at: string | null;
        }> & { quest_id: string; wallet_address: string; target: number };
        Update: Partial<{
          progress: number;
          completed_at: string | null;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
