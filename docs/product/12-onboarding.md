# 12 — Onboarding & Implantação

> Status: entregue 2026-06-08. Módulo de acompanhamento de implantação por contrato + duas trilhas de história do cliente (onboarding e negociação) no RAG. **Atualização (2026-06-08): onboarding virou PROJETO — cronograma de marcos datados, Gantt exportável e biblioteca de templates** (ver seção abaixo, que supera o checklist fixo de 9 etapas).

## Modelo de projeto: cronograma datado + Gantt + templates (2026-06-08)

Cada implantação é um **projeto com cronograma**: marcos **datados e livres** (Kick off, GTs, TSs, Go Live, Handover…), variáveis por escopo. Substitui o checklist fixo de 9 etapas (o catálogo legado `onboarding_stages` continua só como fallback).

- **Biblioteca de templates** (`onboarding_templates` + `onboarding_template_items`): modelos por tipo (ex.: "Implantação Padrão 5+5 semanas", "Express 3+2"). Cada item tem `offset_days` (e `duration_days`) → o sistema **calcula as datas** dos marcos a partir da data de início. Admin em **/onboarding/templates**.
- **Iniciar projeto** (painel do contrato): escolher **template + data de início + responsável + go-live** → marcos criados com datas. Depois é tudo **editável** por escopo (add/remover/renomear marco, mudar datas/status) no painel e na página do cronograma.
- **Marcos** (`onboarding_milestones`, evoluído): `name`, `milestone_type`, `planned_date`, `planned_end`, `status`, `owner_id`, `sort_order` (e `stage_key` legado, agora opcional). **Finalizar um marco avança** o projeto (recompute de etapa atual/status).
- **Gantt do projeto** em **/onboarding/[contractId]**: timeline por semanas + marcos coloridos por status (concluído/em andamento/pendente/atrasado), cabeçalho apresentável (conta, responsável, go-live, modelo) e **export PNG (html-to-image) + PDF (impressão)** para apresentar ao cliente. Editor de marcos abaixo.
- **Dashboard /onboarding**: KPIs + tabela com **próximo marco/data**; linha abre o cronograma; atalho "Modelos".
- **APIs**: `POST /api/onboarding` (start com `template_id`+`start_date`); `/api/onboarding/milestones` (POST add) e `/milestones/[id]` (PATCH/DELETE); `/api/onboarding/templates` (+`/[id]`) CRUD.
- **MCP**: `list_onboarding_templates`, `start_onboarding` (com template), `add_onboarding_milestone`, `set_milestone_date`.

**Follow-ups**: fases/atividades por marco; vínculo com playbooks; saúde automática (travado/atrasado); dependências entre marcos.

---

### (Histórico) Modelo inicial — checklist fixo de 9 etapas

## Visão

Dar visibilidade da **história completa do cliente** dentro da ferramenta. Antes existia apenas o ciclo de renovação; não havia como saber se um contrato estava em onboarding nem em que etapa, e o histórico comercial não alimentava o RAG. Agora:

1. **Módulo Onboarding** (`/onboarding`) — painel gerencial da implantação de todos os contratos, por etapa.
2. **Status de onboarding por contrato** — cada contrato sabe se está/saiu de onboarding e em qual etapa.
3. **Duas trilhas no RAG** — `onboarding` e `negotiation` — para o Perguntar reconstruir a história do cliente.

## Jornada padrão (9 etapas)

Catálogo data-driven em `onboarding_stages` (editável sem deploy). Ordem seedada:

1. `welcome_meeting` — Welcome Meeting (passagem comercial → CS)
2. `kickoff` — Kickoff
3. `gts` — GTs (agendas de entrevista / Grupos de Trabalho)
4. `instance_setup` — Criação da instância & configuração da ferramenta
5. `training` — Treinamentos
6. `go_live` — Go Live
7. `hypercare` — Hypercare
8. `ready` — Tudo pronto
9. `handover` — Handover (Onboarding Kickoff / passagem para o CS de regime)

## Telas

### `/onboarding` (painel gerencial)
- **KPIs** (`StatCardPremium`): em onboarding (ativos), atrasados (go-live vencido), em risco/travados, tempo médio (dias).
- **Board por etapa**: quantos contratos ativos em cada uma das 9 etapas (clicável → filtra a tabela).
- **Tabela**: conta, contrato, etapa atual, responsável de onboarding, progresso (done/total + %), dias em onboarding, go-live alvo, status, saúde. Filtros por status/etapa/busca; export XLSX; clique → `/accounts/[id]`.

### Tela da conta (`/accounts/[id]`) — por contrato
- **OnboardingPanel** (em cada `CompactContractCard`): badge de status + progresso; "Iniciar onboarding" (cria os milestones); checklist das 9 etapas com toggle de status; diário de notas (cada nota alimenta o RAG).
- **NegotiationPanel**: histórico de negociação + "Registrar negociação" (venda inicial / renovação / renegociação), com desconto ofertado/aceito, objeção, argumento de fechamento, contraparte, resultado e notas. Cada registro alimenta o RAG.

## Como operar + o que cada indicador significa

**Dois lugares:** o painel `/onboarding` (gerencial — acompanha, não edita; clique vai à conta) e o painel *Onboarding* no card do contrato dentro da conta (onde se **opera**).

**Fluxo:** *Iniciar onboarding* cria os 9 marcos → mude o status de cada marco (Pendente/Em andamento/Concluído/Pulado) → o sistema **recalcula** sozinho a *etapa atual* (1º marco não concluído), o *% de progresso* e o *status geral* (vira "Concluído" quando todos terminam). Registre *notas* (diário) e *esforço de implantação* (vai ao PSA) ali mesmo.

**Os 4 KPIs do topo do `/onboarding`:**
| Indicador | O que conta |
|---|---|
| **Em onboarding** | Contratos com onboarding **ativo** (status `Em andamento` ou `Pausado`). Não conta concluídos/cancelados. |
| **Atrasados (go-live)** | Dos ativos, quantos têm a **data alvo de go-live já vencida** e ainda não concluíram. |
| **Em risco / travados** | Dos ativos, quantos estão com **saúde** = `Em risco` ou `Travado`. |
| **Tempo médio (dias)** | Média de dias desde o **início** do onboarding dos ativos. |

- **Board por etapa**: para cada uma das 9 etapas, quantos contratos ativos estão **parados naquela etapa** agora (campo `onboarding_current_stage`). Clicar filtra a tabela.
- **Tabela**: uma linha por contrato — conta/contrato, etapa atual, responsável (pode ser ≠ do CSM), progresso (marcos feitos/total + %), dias em onboarding, go-live alvo, status (+ saúde se não "no prazo").

> ⚠️ **Hoje** a *saúde* (`onboarding_health`) e a *data alvo de go-live* são **manuais** — sem automação derivando "travado/atrasado". Logo, "Atrasados" e "Em risco/travados" só acendem se esses campos forem preenchidos (ver follow-up).

## Modelo de dados (migration `20260608120000_onboarding_module.sql`, aditiva)

- **`onboarding_stages`** `(key, label, sort_order, is_active)` — catálogo seedado com as 9 etapas.
- **`contracts`** (colunas novas): `onboarding_status` (`not-started|in-progress|on-hold|completed|cancelled`), `onboarding_current_stage`, `onboarding_owner_id` (FK auth.users — **responsável separado do CSM**), `onboarding_started_at`, `onboarding_target_go_live`, `onboarding_completed_at`, `onboarding_health` (`on-track|at-risk|stalled`).
- **`onboarding_milestones`** `(contract_id, account_id, stage_key, status [pending|in-progress|done|skipped], planned_date, completed_date, owner_id, notes, sort_order)` — `UNIQUE(contract_id, stage_key)`.
- **`onboarding_events`** `(contract_id, account_id, milestone_id?, event_type [note|meeting|blocker|decision|status_change|attachment], title, description, date)` — **unidade ingerida no RAG** (trilha `onboarding`).
- **`contract_negotiation_history`** — **criada** aqui (a migration do Epic 17 nunca foi aplicada no remoto); inclui `negotiation_type` (`initial|renewal|renegotiation`) e `outcome` (`won|renewed|lost|pending`).

## Regras de negócio

- **Iniciar onboarding** (`POST /api/onboarding`): cria um milestone por etapa ativa (`seedMilestonesForContract`), marca o contrato `in-progress`, define a 1ª etapa como atual e registra um evento `status_change` (ingerido no RAG).
- **Recálculo app-side** (`recomputeContractOnboarding` em [onboarding-service.ts](../../src/lib/onboarding/onboarding-service.ts)) — **não usa trigger** (mais testável e seguro em produção): a etapa atual é a 1ª não concluída/pulada; `status` vira `completed` quando todas done/skipped; **preserva `on-hold`/`cancelled`** definidos manualmente.
- **Diário** (`onboarding_events`) e **negociação** (`contract_negotiation_history`) são ingeridos no RAG no create (best-effort) e re-indexáveis via backfill.

## RAG

- `embeddings.source_type` ampliado: `onboarding`, `negotiation` (constraint recriada com o conjunto completo).
- `ingestOnboardingEvent(id)` / `ingestNegotiation(id)` em [rag-pipeline.ts](../../src/lib/rag/rag-pipeline.ts) (espelham `ingestNPSResponse`). O pipeline enriquece e **rotula** as fontes no Perguntar (Onboarding / Negociação).
- **Sizing**: `chunkSize` 512→1024, `chunkOverlap` 50→128 ([env.ts](../../src/lib/env.ts)) — dentro do teto ~2048 tokens do `gemini-embedding-001`; como `embeddings` estava vazio, foi fixado sem re-ingestão.
- **Backfill** (re-indexação retroativa): `POST /api/onboarding/backfill-embeddings` e `POST /api/contracts/negotiation/backfill-embeddings`.

## Esforço de implantação → integração PSA (2026-06-08)

Quando o profissional registra esforço **dentro do Onboarding**, as horas são herdadas do fluxo de esforço e apontadas no sistema **PSA** (controle de horas de implantação) via a Edge Function pública `teams-bot`.

- **Onde**: ação "Registrar esforço de implantação" no `OnboardingPanel` (por contrato). Reusa o parse de IA do esforço (texto livre → horas/data/descrição).
- **Marcação**: o `time_entry` é gravado com `activity_type='onboarding'` (aparece normal no módulo Esforço — "herdado") e gera um `onboarding_event` `event_type='effort'` (entra no diário e na trilha RAG de onboarding, com `time_entry_id`).
- **Envio ao PSA** ([src/lib/integrations/psa.ts](../../src/lib/integrations/psa.ts), chamado em [api/time-entries/route.ts](../../src/app/api/time-entries/route.ts) quando `onboarding_contract_id` está presente): `POST teams-bot` com `{ user_email: e-mail de quem lançou, project_name: nome da conta, hours, date, notes }`. **Best-effort**: falha do PSA não bloqueia o lançamento; a `message` (PT-BR) é exibida ao usuário.
- **Idempotência/observabilidade**: colunas `time_entries.psa_sync_status` (`skipped|pending|synced|failed`), `psa_synced_at`, `psa_message`. Cada esforço = um envio; edições não reenviam (o PSA só insere). O PSA decide `entry_type` (consulting/implementation) pelo tipo do recurso vinculado ao e-mail.
- **Ativação**: **ligado por padrão** — todo esforço de onboarding é enviado automaticamente, sem configuração. A URL da Edge Function tem default embutido em [psa.ts](../../src/lib/integrations/psa.ts) (server-only). Env opcionais: `PSA_TEAMS_BOT_URL` (sobrescreve a URL), `PSA_INTEGRATION_TOKEN`, `PSA_TIMEOUT_MS`. Para **desligar**: `PSA_SYNC_ENABLED=false` (esforço grava e o PSA fica `skipped`).
- **Follow-ups**: entrada rápida no painel `/onboarding`; endpoint admin para reprocessar `failed`; mapa `accounts.psa_project_name` se o nome divergir do projeto no PSA.

## Permissões e visibilidade

- Novo módulo de permissão **`onboarding`** ([modules.ts](../../src/lib/auth/modules.ts)); negociação fica sob **`contracts`**. Item no Sidebar (grupo Operação, ícone Rocket).
- RLS (modelo vigente "internos veem tudo"): `onboarding_stages` leitura para interno; `onboarding_milestones`, `onboarding_events`, `contract_negotiation_history` → `FOR ALL using is_internal_user()` (portal/externo bloqueado). Ver [permissions-plan.md](permissions-plan.md).

## Verificação

1. Migration confirmada via `execute_sql`: 4 tabelas + 7 colunas em `contracts` + seed das 9 etapas + constraint do RAG.
2. Iniciar onboarding de um contrato → 9 milestones criados; avançar etapas → `onboarding_current_stage`/`onboarding_status` recalculam; nota no diário aparece e é ingerida.
3. `/onboarding`: contrato listado com etapa/owner/dias; KPIs e board batem; export XLSX.
4. Perguntar: "como foi o onboarding da conta X" e "como foi a negociação da conta Y" retornam as trilhas certas com fontes rotuladas.
5. `npx tsc --noEmit` exit 0; `npm run build` ✓.

## Follow-up

- Fundir as trilhas `onboarding`/`negociação` na `AccountUnifiedTimeline` (hoje visíveis nos painéis por contrato e no Perguntar).
- Editor das etapas do catálogo em settings (hoje seedadas via migration).
