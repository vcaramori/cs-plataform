-- A sincronização do HelpDesk grava support_tickets.source = 'helpdesk', mas o CHECK
-- original só permitia ('csv','manual','email'). Resultado: TODOS os upserts de chamados
-- violavam o constraint e falhavam (0 criados; tudo caía em result.errors, escondido do
-- toast). Adiciona 'helpdesk' à lista de origens permitidas.
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_source_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_source_check
  CHECK (source = ANY (ARRAY['csv'::text, 'manual'::text, 'email'::text, 'helpdesk'::text]));
