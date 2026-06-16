-- Campo de TAGS do HelpDesk na conta: códigos do assunto (ex.: "ANDI, COCACOLAANDINA")
-- separados por vírgula. Usado na resolução automática de chamados → conta, de forma
-- visível/editável na interface (em vez de um de-para escondido em app_settings).
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS helpdesk_tags text;

COMMENT ON COLUMN public.accounts.helpdesk_tags IS
  'Códigos/aliases do HelpDesk (separados por vírgula) para casar [CÓDIGO] do assunto com a conta.';
