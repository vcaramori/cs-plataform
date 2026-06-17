-- Conversa completa importada do HelpDesk (1 linha por evento): mensagens (HTML + anexos),
-- mudanças de status, atribuição, pedido de avaliação. Renderizada na tela de detalhe em
-- scroll único. RLS ligada sem policies → leitura só via service role (a página já valida o
-- acesso ao chamado por RLS antes de buscar a thread pelo admin).
CREATE TABLE IF NOT EXISTS helpdesk_thread_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  external_event_id text,
  kind text NOT NULL,            -- message | status | assignment | rating_request | note | other
  author_type text,              -- client | agent | system
  author_name text,
  author_email text,
  body_html text,                -- HTML do e-mail com imagens inline (cid→url) já reescritas
  body_text text,
  is_private boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{name,url,type,size}]
  metadata jsonb,                -- ex.: {status_old, status_new}
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_helpdesk_thread_ticket ON helpdesk_thread_events(ticket_id, occurred_at);
ALTER TABLE helpdesk_thread_events ENABLE ROW LEVEL SECURITY;

-- Tempo médio de resposta (intervalo solicitante→resposta do agente): corrido e útil (SLA).
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS avg_response_minutes integer,
  ADD COLUMN IF NOT EXISTS avg_response_business_minutes integer;
