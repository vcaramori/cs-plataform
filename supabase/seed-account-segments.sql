-- Seed default account segments (saved views for filtering)
-- These will be available to all CSMs for quick access

-- Insert 4 default segments into saved_views
INSERT INTO saved_views (id, name, entity_type, filter_config, created_by, created_at)
SELECT
  gen_random_uuid(),
  name,
  'account',
  filter_config::jsonb,
  (SELECT id FROM auth.users LIMIT 1),
  NOW()
FROM (
  VALUES
    ('Em Risco', '{"health_status":"at-risk"}'),
    ('Enterprise', '{"mrr_min":10000}'),
    ('Renovação 90d', '{"renewal_date_max":"90 days"}'),
    ('SMB', '{"mrr_max":3000}')
) AS defaults(name, filter_config)
WHERE NOT EXISTS (
  SELECT 1 FROM saved_views
  WHERE entity_type = 'account'
  AND name IN ('Em Risco', 'Enterprise', 'Renovação 90d', 'SMB')
);
