-- Epic 37.1: App Settings Table for Global Configuration

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admin/super_admin can read settings
CREATE POLICY "Admin can read app settings"
  ON public.app_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Only admin/super_admin can update settings
CREATE POLICY "Admin can update app settings"
  ON public.app_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('health_score_weights', '{"sla_compliance": 0.35, "nps": 0.30, "adoption": 0.25, "relationship": 0.10}', 'Health score calculation weights'),
  ('health_score_thresholds', '{"critical": 50, "at_risk": 75, "healthy": 100}', 'Health score threshold boundaries'),
  ('cron_schedule_health_score', '{"enabled": true, "minute": "0", "hour": "6", "day_of_week": "*"}', 'Cron schedule for daily health score calculation'),
  ('alert_silent_days_enterprise', '14', 'Silent days threshold for Enterprise accounts'),
  ('alert_silent_days_mid_market', '21', 'Silent days threshold for Mid-Market accounts'),
  ('alert_silent_days_smb', '30', 'Silent days threshold for SMB accounts'),
  ('alert_health_threshold_playbook_trigger', '50', 'Health score threshold to trigger playbook alert'),
  ('auto_checkin_approval_hours', '4', 'Hours to approve auto check-in before automatic send'),
  ('auto_checkin_approval_business_hours_only', 'true', 'Only count business hours for approval deadline'),
  ('support_auto_close_hours', '72', 'Hours before auto-closing resolved support tickets'),
  ('support_similarity_threshold', '0.75', 'Similarity threshold for duplicate ticket detection'),
  ('nps_promoter_score', '9', 'NPS score threshold for promoter'),
  ('nps_detractor_score', '6', 'NPS score threshold for detractor'),
  ('ai_model_active', '"gemini-pro"', 'Active AI model for content generation'),
  ('ai_confidence_threshold', '0.75', 'Confidence threshold for AI-generated content'),
  ('ai_cache_ttl_hours', '24', 'TTL in hours for AI response caching'),
  ('smtp_enabled', 'true', 'Enable SMTP for email sending'),
  ('slack_webhook_enabled', 'false', 'Enable Slack webhook integrations')
ON CONFLICT (key) DO NOTHING;

-- Function to update app_settings.updated_at on change
CREATE OR REPLACE FUNCTION public.fn_update_app_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_app_settings_updated_at();
