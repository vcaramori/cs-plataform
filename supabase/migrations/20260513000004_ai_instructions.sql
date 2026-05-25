-- Adiciona chaves de instrução editável para cada interface de IA
-- Valor vazio string = usar fallback hardcoded no código

INSERT INTO public.app_settings (key, value, description) VALUES
  ('instruction_chat',
   '""'::jsonb,
   'System instruction do Chat Rápido (widget lateral disponível em qualquer página)'),
  ('instruction_review_reply',
   '""'::jsonb,
   'System instruction do Revisor de Respostas a tickets de suporte'),
  ('instruction_shadow_score',
   '""'::jsonb,
   'System instruction do Shadow Health Score (automação de cálculo de saúde via IA)'),
  ('instruction_auto_checkin',
   '""'::jsonb,
   'System instruction do Auto Check-in (geração de emails para contas em silêncio)')
ON CONFLICT (key) DO NOTHING;
