-- Wave 7: Epic 30 - Webhooks Infrastructure
-- Create webhook endpoints table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'hmac' CHECK (auth_type IN ('hmac', 'bearer', 'custom')),
  auth_token TEXT,
  rate_limit INT NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create webhook deliveries table for tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  response_body TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_ms INT
);

-- Create RLS policies
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage webhooks for their account" ON webhooks
  FOR ALL USING (auth.uid()::text = (SELECT created_by::text FROM accounts WHERE id = account_id));

CREATE POLICY "Users can view deliveries for their webhooks" ON webhook_deliveries
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM webhooks w WHERE w.id = webhook_deliveries.webhook_id
    AND w.account_id = (SELECT account_id FROM webhooks WHERE id = webhook_id)
    AND auth.uid()::text = (SELECT created_by::text FROM accounts WHERE id = w.account_id)
  ));

-- Create indexes
CREATE INDEX idx_webhooks_account_id ON webhooks(account_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status_code);
