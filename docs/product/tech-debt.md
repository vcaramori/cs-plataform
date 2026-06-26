# Registro de Débitos Técnicos

> Lista viva de débitos técnicos / bugs conhecidos da plataforma. **Toda vez que encontrarmos um débito, registrar aqui** (mesmo que não vá corrigir na hora), com: data, área, o que é, impacto e correção sugerida. Mover para "Resolvidos" quando fechado.

## 🔴 Aberto

### Voz do Cliente — follow-ups da Fase 3 (feature, 2026-06-23)
- **Marcar falso-positivo** a partir de um sinal de VoC: `risk_curation_feedback.source` tem CHECK só `alert|assessment`; ampliar o enum (ou criar caminho próprio) para registrar falso-positivo de sentimento. É **feature de Fase 3** — exige também o caminho de UI/ação; só ampliar o CHECK não resolve sozinho.
- **Tie-ins** do índice VoC com o **health-score** (componente de sentimento) e com o **RAG/Perguntar** (contexto por conta) — ainda não ligados.
- Normalização de temas de VoC por **dicionário** (`voc_theme_synonyms`), sem clustering por IA. Evolução assíncrona possível.

### Read.ai — webhook não traz `metrics.sentiment` (baixo impacto, 2026-06-23)
Reuniões que chegam só por webhook ficam sem sentimento até o próximo fetch REST. **Baixo impacto:** o cron `readai-sync` (horário) re-busca reuniões recentes e preenche o sentimento em ≤1h. Fechar o gap (enfileirar um fetch leve de métricas no webhook) é otimização, não correção urgente. (O `read_score`/engagement já passou a ser persistido em `interactions.meta.metrics` — ver Resolvidos.)

### `interactions.quotes` — coluna não usada (decisão: manter, 2026-06-23)
Coluna jsonb criada por migração, nunca populada. **Decisão: manter** (sem custo; candidata a ser populada por extração de citações por reunião no futuro). Drop seria migração destrutiva — não fazer agora.

### IA — `sentiment_response_suggestion` sem consumidor (2026-06-25)
O único call site dessa instrução era o `advanced-alerts-service` (removido — ver Resolvidos). A instrução continua no catálogo, mas **não é mais chamada**. Decidir: remover do catálogo ou religar a uma sugestão de resposta no caminho de alertas que funciona (`proactive_alerts`).

### IA — `time_entry_parse` ainda com contrato no user prompt (2026-06-25)
Na governança de prompts, 13 tarefas Type B foram refatoradas (instrução → system instruction). `time_entry_parse` ([parse-time-entry.ts](../../src/lib/gemini/parse-time-entry.ts)) foi a **exceção deliberada**: tem o contrato JSON mais intricado da plataforma (enums, conversão de horas, action_items, regra de escape `\n` para não quebrar `JSON.parse`) e o parser não usa `safeParseLLMJson`. O system instruction foi enriquecido (editável), mas o spec rígido continua no user prompt. Pendente: refatorar movendo 100% ao system instruction **sob verificação adversarial**. Baixo risco atual (system e user concordam no mesmo JSON), mas não é 100% editável pelo admin.

### Read.ai — corrida no refresh de token sob sync concorrente (mitigada, root cause aberto, 2026-06-24)
O refresh token do Read.ai é single-use rotativo; cron + clique concorrentes para o mesmo CSM podiam invalidar um do outro. **Mitigado** (ver Resolvidos: retry-on-refresh-fail). O root cause (ausência de lock por usuário) permanece — uma serialização real (advisory lock / claim em `readai_sync_state`) eliminaria a janela por completo. Baixa prioridade enquanto a mitigação segurar.

## ✅ Resolvidos

- (2026-06-25) **Schema desalinhado — queries em colunas inexistentes** — auditado contra o schema real (`information_schema`) e os logs do Postgres; corrigido em todos os call sites:
  - `proactive_alerts.alert_type/title/description/tags` (**erro ATIVO** no log, vindo do bloco de alertas do RAG) → colunas reais `type/message/metadata` em [rag-pipeline.ts](../../src/lib/rag/rag-pipeline.ts). O contexto "alertas ativos" do Perguntar estava sempre vazio.
  - `sla_events.sla_status_resolution` (**erro ATIVO**, cron `escalate-sla-violations` horário) → os campos `sla_status_resolution`/`resolution_deadline` são do `support_tickets`, não do embed `sla_events`; corrigido em [sla-escalation.ts](../../src/lib/support/sla-escalation.ts).
  - `ticket_events.occurred_at` + `metadata` → `created_at` + `payload` em [ticket-summary.ts](../../src/lib/support/ticket-summary.ts).
  - `support_ticket_messages.deleted_at` (não existe) e `message_type`→`type` em [sentiment-analysis.ts](../../src/lib/support/sentiment-analysis.ts) e na rota sentiment-trend.
  - `contracts.created_at` (não existe) → `renewal_date` (renovação/churn), `start_date` (expansão/candidatos) e `onboarding_started_at` (onboarding) conforme a semântica, em cs-ops-service, productivity-service, readai/ingest e onboarding/route.
  - `health_scores.health_score_v2` (vive em `accounts`) → `checkPlaybookTrigger` agora lê de `accounts` ([alert-service.ts](../../src/lib/alerts/alert-service.ts)). Antes o `playbook_trigger` nunca disparava.
  - `adoption_metrics.active_feature_count`/`evaluated_at` (a tabela é EAV `metric_name/value/measured_at` e está vazia) → `checkAdoptionAnomaly` reescrito para as colunas reais; retorna null sem erro de schema.
- (2026-06-25) **Auditoria dos 15 jobs pg_cron** — os erros de schema dos crons vinham do bloco de alertas do RAG e do `escalate-sla-violations` (ambos corrigidos acima); `cron-auto-assign-tickets` (job 8) está hígido (só logava `starting`); `cron-alert-analysis` foi removido (abaixo).
- (2026-06-25) **`advanced-alerts-service` morto-quebrado removido** — escrevia numa tabela `alerts` inexistente e lia de 4 tabelas inexistentes (`churn_risk_history`, `anomaly_detection`, `sentiment_trigger_events`, `adoption_cliff_events`); o cron semanal `cron-alert-analysis` (job 6) produzia 0 alertas e logava 5 falhas/semana. A funcionalidade já é coberta pelo caminho `proactive_alerts` (AlertService + catalog-alerts). Removidos: o service, a rota `/api/cron/alert-analysis`, a edge function `cron-alert-analysis`, as entradas em `generate-crons.js`/`generate-sql.js`, os blocos em `register-crons*.sql`, e o job pg_cron foi desagendado (`cron.unschedule`).
- (2026-06-25) **Código morto `voc-service.ts` removido** — fetchers legados para endpoints 404 (`/api/voc/trends|themes|quotes|sentiment`), sem nenhum importador.
- (2026-06-25) **Read.ai `read_score`/engagement persistidos** — `interactions.meta.metrics` agora guarda o bloco `metrics` inteiro do Read.ai (antes só `sentiment`). jsonb, sem migração.
- (2026-06-25) **Corrida no refresh de token (Read.ai) mitigada** — `getValidAccessToken` ([tokens.ts](../../src/lib/integrations/readai/tokens.ts)), ao falhar o refresh, relê uma vez o token: uma execução concorrente provavelmente já rotacionou e persistiu um access token novo e válido. Sem migração/lock. O erro transitório "token inválido" deve sumir na prática.
- (2026-06-25) **Bug de precedência default↔fallback nos prompts de IA** — `buildSystemInstruction` resolve `override ?? catalogDefault ?? fallback`; como toda entrada do catálogo tinha `default`, os prompts ricos escritos no call site (passados como fallback) **nunca rodavam**. Resolvido: os `default` do catálogo ([instructions-catalog.ts](../../src/lib/ai/instructions-catalog.ts)) passaram a SER os prompts ricos (fonte de verdade versionada); fallbacks longos redundantes (rag-pipeline, predictive-risk) reduzidos a rede de segurança curta. Playbook: [16-ia-prompts.md](16-ia-prompts.md).
- (2026-06-25) **Prompt "VoC Extraction" (4669 chars) mal-aplicado em 3 tarefas com contratos diferentes** — estava como override em `app_settings` para `interaction_sentiment` (parser `parseFloat` esperava número puro → caía para 0.0), `signal_extractor` (esperava `{wishlist,opportunities}` → sinais perdidos) e `voc_enrichment` (3 contratos distintos → frágil). Os 6 overrides existentes foram limpos; cada tarefa voltou a rodar o default correto que preserva seu contrato.
- (2026-06-25) **Instrução real no user-prompt hardcoded (Type B)** — 13 call sites tinham a instrução/contrato no user prompt (não editável pelo admin). Refatorados: instrução movida ao system instruction (catálogo, editável); user prompt ficou só com dados. Exceção: `time_entry_parse` (ver Aberto).
- (2026-06-24) Import self-service não fazia backfill histórico bounded → agora "Importar"/conectar seta `backfill_from` (default 1º jan do ano) e o cron completa sozinho (autônomo + IO-safe).
- (2026-06-23) Read.ai não importava transcrição — contrato REST errado (`expand[]` + shape `turns/text`). Corrigido.
- (2026-06-23) Overflow de `numeric` (duração/sentiment) abortava ingest do Read.ai. Corrigido (clamp).
- (2026-06-23) Backfill do Read.ai travava (estado salvo só no fim) e estourava o tempo. Corrigido (cursor por página + orçamento por reunião + piso `backfill_from`).
