-- O sync do HelpDesk faz upsert em csat_responses com onConflict='ticket_id'
-- (1 avaliação por chamado), mas a tabela não tinha constraint UNIQUE em ticket_id →
-- o upsert do CSAT falhava ("no unique or exclusion constraint matching the ON CONFLICT
-- specification"), resultando em "0 CSAT" mesmo com chamados avaliados. Adiciona o UNIQUE.
ALTER TABLE csat_responses
  ADD CONSTRAINT csat_responses_ticket_id_key UNIQUE (ticket_id);
