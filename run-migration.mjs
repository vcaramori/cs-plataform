import pg from 'pg'
const { Client } = pg

const SQL = `
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admin can read app settings') THEN
    CREATE POLICY "Admin can read app settings"
      ON public.app_settings FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admin can update app settings') THEN
    CREATE POLICY "Admin can update app settings"
      ON public.app_settings FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Admin can insert app settings') THEN
    CREATE POLICY "Admin can insert app settings"
      ON public.app_settings FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $do$;

INSERT INTO public.app_settings (key, value, description) VALUES
  ('health_score_weights', '{"sla_compliance": 0.35, "nps": 0.30, "adoption": 0.25, "relationship": 0.10}', 'Health score calculation weights'),
  ('health_score_thresholds', '{"critical": 50, "at_risk": 75, "healthy": 100}', 'Health score threshold boundaries'),
  ('rag_ai_settings', '{"llm_model":"claude-haiku-4-5-20251001","temperature":0.1,"max_tokens_response":2048,"rag_top_k":5,"rag_confidence_threshold":0.7,"rag_cache_ttl_hours":24,"embedding_model":"text-embedding-004"}', 'AI model and RAG engine parameters'),
  ('rag_system_instruction', '""', 'Custom system instruction for RAG pipeline. Leave empty to use hardcoded default.'),
  ('instruction_chat', '""', 'System instruction do Chat Rapido'),
  ('instruction_review_reply', '""', 'System instruction do Revisor de Respostas a tickets'),
  ('instruction_shadow_score', '""', 'System instruction do Shadow Health Score'),
  ('instruction_auto_checkin', '""', 'System instruction do Auto Check-in')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_update_app_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_app_settings_updated_at();
`

const pass = 'dUdZs3DR7GSlaZyj'
const ref = 'mgkwaejxazwwevblqycd'

// sa-east-1 pooler IPs (from nslookup — IPv4 confirmed)
const connectionOptions = [
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
  { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { host: '54.94.90.106', port: 5432, user: `postgres.${ref}` },
  { host: '54.94.90.106', port: 6543, user: `postgres.${ref}` },
  { host: '52.67.1.88', port: 5432, user: `postgres.${ref}` },
  { host: '52.67.1.88', port: 6543, user: `postgres.${ref}` },
]

for (const opt of connectionOptions) {
  const client = new Client({
    ...opt,
    database: 'postgres',
    password: pass,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })
  try {
    process.stdout.write(`Tentando ${opt.host}:${opt.port}... `)
    await client.connect()
    console.log('CONECTADO!')
    await client.query(SQL)
    console.log('✅ Migration executada com sucesso!')
    const { rows } = await client.query('SELECT key FROM public.app_settings ORDER BY key')
    console.log('Chaves:', rows.map(r => r.key).join(', '))
    await client.end()
    process.exit(0)
  } catch (err) {
    console.log(`❌ ${err.message}`)
    try { await client.end() } catch {}
  }
}

console.error('Todas as tentativas falharam.')
process.exit(1)
