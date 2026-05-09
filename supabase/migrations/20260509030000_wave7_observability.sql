-- Wave 7: Epic 37 - Observability & Monitoring

-- Structured logs table
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  user_id UUID,
  request_id TEXT,
  trace_id TEXT,
  span_id TEXT,
  error_stack TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Request tracing table
CREATE TABLE IF NOT EXISTS request_traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL UNIQUE,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INT,
  response_time_ms INT,
  user_id UUID,
  error_message TEXT,
  spans JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
  value FLOAT NOT NULL,
  labels JSONB DEFAULT '{}'::jsonb,
  service TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Error events table
CREATE TABLE IF NOT EXISTS error_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_resolved BOOLEAN DEFAULT false,
  service TEXT,
  user_id UUID,
  request_id TEXT,
  trace_id TEXT,
  fingerprint TEXT,
  first_occurrence TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT now(),
  occurrence_count INT DEFAULT 1
);

-- Alert configuration
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  duration_seconds INT DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert incidents
CREATE TABLE IF NOT EXISTS alert_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  value FLOAT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  incident_details JSONB
);

-- Enable RLS
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_incidents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view logs for their requests" ON application_logs
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Authenticated users can view their request traces" ON request_traces
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Authenticated users can view their error events" ON error_events
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IS NULL);

CREATE POLICY "Admins can view all metrics" ON metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage alert rules" ON alert_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view alert incidents" ON alert_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_application_logs_level ON application_logs(level);
CREATE INDEX idx_application_logs_service ON application_logs(service);
CREATE INDEX idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX idx_application_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX idx_application_logs_trace_id ON application_logs(trace_id);
CREATE INDEX idx_request_traces_trace_id ON request_traces(trace_id);
CREATE INDEX idx_request_traces_user_id ON request_traces(user_id);
CREATE INDEX idx_request_traces_created_at ON request_traces(created_at DESC);
CREATE INDEX idx_request_traces_status ON request_traces(response_status);
CREATE INDEX idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX idx_metrics_service ON metrics(service);
CREATE INDEX idx_error_events_fingerprint ON error_events(fingerprint);
CREATE INDEX idx_error_events_severity ON error_events(severity);
CREATE INDEX idx_error_events_created_at ON error_events(first_occurrence DESC);
CREATE INDEX idx_error_events_is_resolved ON error_events(is_resolved);
CREATE INDEX idx_alert_incidents_alert_rule_id ON alert_incidents(alert_rule_id);
CREATE INDEX idx_alert_incidents_triggered_at ON alert_incidents(triggered_at DESC);
CREATE INDEX idx_alert_incidents_is_active ON alert_incidents(is_active);
