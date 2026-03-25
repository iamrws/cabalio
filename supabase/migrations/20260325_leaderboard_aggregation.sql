-- H3 Fix: SQL aggregation functions for leaderboard to avoid client-side truncation.
-- These replace the previous approach of fetching all rows with .limit().

-- Aggregate points for a specific ISO week (date range)
CREATE OR REPLACE FUNCTION aggregate_leaderboard_weekly(
  week_start TIMESTAMPTZ,
  week_end TIMESTAMPTZ
)
RETURNS TABLE(wallet_address TEXT, total_points BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pl.wallet_address,
    COALESCE(SUM(pl.points_delta), 0) AS total_points
  FROM points_ledger pl
  WHERE pl.created_at >= week_start
    AND pl.created_at < week_end
  GROUP BY pl.wallet_address;
$$;

-- Aggregate all-time points
CREATE OR REPLACE FUNCTION aggregate_leaderboard_alltime()
RETURNS TABLE(wallet_address TEXT, total_points BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pl.wallet_address,
    COALESCE(SUM(pl.points_delta), 0) AS total_points
  FROM points_ledger pl
  GROUP BY pl.wallet_address;
$$;
