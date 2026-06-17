-- Indicadores de atendimento do HelpDesk:
--  - first_response_business_minutes / resolution_business_minutes: tempos em HORÁRIO
--    COMERCIAL (SLA), complementando os tempos corridos (calculados de opened/resolved no app).
--  - public_message_count: total de mensagens públicas (cliente+agente) — base da
--    "média de interações para resolução".
--  - agent_reply_count: respostas públicas do agente — base do FCR (encerrado em 1ª resposta).
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS first_response_business_minutes integer,
  ADD COLUMN IF NOT EXISTS resolution_business_minutes integer,
  ADD COLUMN IF NOT EXISTS public_message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_reply_count integer NOT NULL DEFAULT 0;
