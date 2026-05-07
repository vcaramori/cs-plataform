-- F2-03: Dynamic Segmentation for Accounts
-- Create indexes to improve filter performance on account queries

-- Index on health_status for health-based filtering
CREATE INDEX IF NOT EXISTS idx_accounts_health_status
ON accounts(health_status)
WHERE deleted_at IS NULL;

-- Index on segment for segment-based filtering
CREATE INDEX IF NOT EXISTS idx_accounts_segment
ON accounts(segment)
WHERE deleted_at IS NULL;

-- Index on csm_owner_id for CSM-based filtering (RLS)
CREATE INDEX IF NOT EXISTS idx_accounts_csm_owner_id
ON accounts(csm_owner_id)
WHERE deleted_at IS NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_accounts_health_segment
ON accounts(health_status, segment)
WHERE deleted_at IS NULL;

-- Composite index for CSM + health status (common in dashboards)
CREATE INDEX IF NOT EXISTS idx_accounts_csm_health
ON accounts(csm_owner_id, health_status)
WHERE deleted_at IS NULL;

-- Index on contracts table for MRR-based filtering
CREATE INDEX IF NOT EXISTS idx_contracts_mrr
ON contracts(mrr)
WHERE deleted_at IS NULL;

-- Index on contract status for status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status
ON contracts(status)
WHERE deleted_at IS NULL;

-- Composite index on contracts for common filter combinations
CREATE INDEX IF NOT EXISTS idx_contracts_account_status
ON contracts(account_id, status)
WHERE deleted_at IS NULL;
