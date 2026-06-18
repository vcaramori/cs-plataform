-- Reuniões do Read.ai gravadas como interactions (type='meeting', source='readai').
-- Campos para dedup por reunião e dados ricos da reunião.
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS external_meeting_id text;
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS meta jsonb;

-- 1 reunião externa (ULID do Read.ai) => 1 interaction (chave de dedup/upsert).
CREATE UNIQUE INDEX IF NOT EXISTS ux_interactions_external_meeting_id
  ON public.interactions (external_meeting_id)
  WHERE external_meeting_id IS NOT NULL;

COMMENT ON COLUMN public.interactions.external_meeting_id IS 'ULID da reunião no Read.ai (dedup do sync).';
COMMENT ON COLUMN public.interactions.meta IS 'Dados ricos da reunião (participants, action_items, topics, report_url).';
