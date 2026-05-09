-- Wave 7: CRM, Support, and BI Integration Tables

-- CRM Integrations table
CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('salesforce', 'hubspot')),
  api_key TEXT NOT NULL,
  api_secret TEXT,
  instance_url TEXT,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'inbound', 'outbound')),
  field_mapping JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Support Integrations table
CREATE TABLE IF NOT EXISTS support_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  support_type TEXT NOT NULL CHECK (support_type IN ('zendesk', 'jira_sd')),
  api_key TEXT NOT NULL,
  api_secret TEXT,
  instance_url TEXT,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- BI Integrations table
CREATE TABLE IF NOT EXISTS bi_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  bi_type TEXT NOT NULL CHECK (bi_type IN ('bigquery', 'snowflake', 'tableau', 'looker')),
  api_key TEXT NOT NULL,
  api_secret TEXT,
  instance_url TEXT,
  dataset_id TEXT,
  schema_name TEXT,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  export_frequency TEXT DEFAULT 'daily' CHECK (export_frequency IN ('hourly', 'daily', 'weekly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- CRM Sync Logs
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('accounts', 'contacts', 'deals')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  records_synced INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT
);

-- Support Sync Logs
CREATE TABLE IF NOT EXISTS support_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES support_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('tickets', 'comments')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  records_synced INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT
);

-- BI Export Logs
CREATE TABLE IF NOT EXISTS bi_export_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES bi_integrations(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  rows_exported INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT
);

-- RLS Policies
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_export_logs ENABLE ROW LEVEL SECURITY;

-- CRM Integration policies
CREATE POLICY "Users can manage CRM integrations for their account" ON crm_integrations
  FOR ALL USING (auth.uid()::text = (SELECT created_by::text FROM crm_integrations ci WHERE ci.id = id));

-- Support Integration policies
CREATE POLICY "Users can manage support integrations for their account" ON support_integrations
  FOR ALL USING (auth.uid()::text = (SELECT created_by::text FROM support_integrations si WHERE si.id = id));

-- BI Integration policies
CREATE POLICY "Users can manage BI integrations for their account" ON bi_integrations
  FOR ALL USING (auth.uid()::text = (SELECT created_by::text FROM bi_integrations bi WHERE bi.id = id));

-- Log access policies
CREATE POLICY "Users can view sync logs for their integrations" ON crm_sync_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM crm_integrations WHERE id = integration_id
    AND account_id IN (SELECT account_id FROM crm_integrations WHERE id = integration_id)
  ));

CREATE POLICY "Users can view support sync logs" ON support_sync_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM support_integrations WHERE id = integration_id
    AND account_id IN (SELECT account_id FROM support_integrations WHERE id = integration_id)
  ));

CREATE POLICY "Users can view BI export logs" ON bi_export_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bi_integrations WHERE id = integration_id
    AND account_id IN (SELECT account_id FROM bi_integrations WHERE id = integration_id)
  ));

-- Indexes
CREATE INDEX idx_crm_integrations_account_id ON crm_integrations(account_id);
CREATE INDEX idx_crm_integrations_type ON crm_integrations(crm_type);
CREATE INDEX idx_support_integrations_account_id ON support_integrations(account_id);
CREATE INDEX idx_support_integrations_type ON support_integrations(support_type);
CREATE INDEX idx_bi_integrations_account_id ON bi_integrations(account_id);
CREATE INDEX idx_bi_integrations_type ON bi_integrations(bi_type);
CREATE INDEX idx_crm_sync_logs_integration_id ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_created_at ON crm_sync_logs(started_at);
CREATE INDEX idx_support_sync_logs_integration_id ON support_sync_logs(integration_id);
CREATE INDEX idx_support_sync_logs_created_at ON support_sync_logs(started_at);
CREATE INDEX idx_bi_export_logs_integration_id ON bi_export_logs(integration_id);
CREATE INDEX idx_bi_export_logs_created_at ON bi_export_logs(started_at);
