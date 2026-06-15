-- HelpDesk sync: garante dedup/upsert por chave externa e 1 CSAT por ticket.
-- Permite ON CONFLICT em support_tickets.external_ticket_id e csat_responses.ticket_id.

-- 1 ticket externo => 1 linha em support_tickets (chave de dedup do sync HelpDesk).
CREATE UNIQUE INDEX IF NOT EXISTS ux_support_tickets_external_ticket_id
  ON public.support_tickets (external_ticket_id)
  WHERE external_ticket_id IS NOT NULL;

-- 1 avaliação CSAT por ticket (permite upsert da nota quando o cliente avalia
-- depois da 1ª carga, durante a janela solved -> closed).
CREATE UNIQUE INDEX IF NOT EXISTS ux_csat_responses_ticket_id
  ON public.csat_responses (ticket_id);
