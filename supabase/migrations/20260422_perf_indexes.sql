-- Performance indexes added 2026-04-22.
-- Composite index accelerates list queries that filter by submission status
-- and order by recency (e.g. GET /api/submissions, admin review queues).
CREATE INDEX IF NOT EXISTS idx_submissions_status_created
  ON submissions(status, created_at DESC);
