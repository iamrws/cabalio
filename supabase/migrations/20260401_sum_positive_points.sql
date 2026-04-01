-- RPC function to sum all positive points_delta values without hitting
-- the Supabase default row limit (1000). Used by /api/community-stats.
CREATE OR REPLACE FUNCTION sum_positive_points()
RETURNS TABLE(total BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(points_delta), 0)::BIGINT AS total
  FROM points_ledger
  WHERE points_delta > 0;
$$;
