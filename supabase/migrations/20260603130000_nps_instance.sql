-- Migration: Modelo de "instância" para o NPS
-- Contexto: o embed roda nas ferramentas Plannera. O Plannera NÃO conhece um
-- "user_id" interno do CS — ele conhece (a) a INSTÂNCIA do sistema (a URL da
-- instância, já registrada no contrato em contracts.instance_url) e (b) o EMAIL
-- de login do usuário. A instância é o que permite amarrar a resposta à conta
-- correta (account_id). Uma mesma conta pode ter VÁRIAS instâncias (vários
-- contratos / endereços) — a agregação soma todas.

-- 1) Índice para resolver instância -> contrato -> conta com eficiência.
--    (contracts.instance_url já existe; aqui só otimizamos a busca)
CREATE INDEX IF NOT EXISTS contracts_instance_url_idx
  ON public.contracts(instance_url)
  WHERE instance_url IS NOT NULL;

-- 2) Respostas de NPS passam a guardar a instância recebida do embed.
--    Mesmo quando a instância ainda não está cadastrada em nenhum contrato,
--    a resposta é gravada (account_id NULL) e fica "órfã"; ao cadastrar o
--    contrato com essa instância, fazemos o vínculo retroativo (backfill).
ALTER TABLE public.nps_responses
  ADD COLUMN IF NOT EXISTS instance TEXT;

CREATE INDEX IF NOT EXISTS nps_responses_instance_idx
  ON public.nps_responses(instance)
  WHERE instance IS NOT NULL;

COMMENT ON COLUMN public.nps_responses.instance IS
  'Instância do sistema que originou a resposta (data-instance do embed = contracts.instance_url). Resolve a conta; pode ficar NULL (órfã) até o contrato ser cadastrado.';

COMMENT ON COLUMN public.nps_responses.user_id IS
  'DEPRECATED: não é mais enviado pelo embed. Mantido por compatibilidade histórica. Use a coluna instance.';
