-- Adiciona chave para system instruction editável do RAG
-- Valor vazio = usar o fallback hardcoded em rag-pipeline.ts

INSERT INTO public.app_settings (key, value, description) VALUES
  ('rag_system_instruction', '""'::jsonb, 'Custom system instruction for RAG pipeline. Leave empty to use the hardcoded default.'),
  ('rag_ai_settings', '{"llm_model":"claude-haiku-4-5-20251001","temperature":0.1,"max_tokens_response":2048,"rag_top_k":5,"rag_confidence_threshold":0.7,"rag_cache_ttl_hours":24,"embedding_model":"text-embedding-004"}'::jsonb, 'AI model and RAG engine parameters')
ON CONFLICT (key) DO NOTHING;

-- INSERT policy estava faltando na migração original
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings' AND policyname = 'Admin can insert app settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can insert app settings"
        ON public.app_settings FOR INSERT
        WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
    $policy$;
  END IF;
END $$;
