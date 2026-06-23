# Registro de Débitos Técnicos

> Lista viva de débitos técnicos / bugs conhecidos da plataforma. **Toda vez que encontrarmos um débito, registrar aqui** (mesmo que não vá corrigir na hora), com: data, área, o que é, impacto e correção sugerida. Mover para "Resolvidos" quando fechado.

## 🔴 Aberto

### Schema desalinhado — queries apontando para colunas inexistentes (2026-06-23)
Erros `ERROR: column ... does not exist` aparecem nos logs do Postgres (vistos via `get_logs`), de crons/queries de **outros módulos** (não Read.ai/VoC). Cada um é uma query (cron ou rota) que referencia coluna que não existe no schema atual — provavelmente migração não aplicada ou código à frente do banco. Impacto: a feature daquela query falha silenciosamente (cron 500, dado vazio). Investigar a origem de cada um e alinhar (migrar a coluna ou corrigir a query):
- `contracts.created_at` (aparece com muita frequência — algo consulta contratos por created_at)
- `ticket_events.occurred_at`
- `support_ticket_messages.deleted_at`
- `proactive_alerts.alert_type`
- `health_scores.health_score_v2`
- `adoption_metrics.active_feature_count`

### Crons de outros módulos com erro (2026-06-23)
- `cron-auto-assign-tickets` (job 8, a cada 5min) — logava erros de schema (`ticket_events.occurred_at`, `support_ticket_messages.deleted_at`). Verificar se está de fato funcionando.
- Vários crons referenciam colunas inexistentes (ver item acima). Auditar os 13 jobs pg_cron.

### Voz do Cliente — follow-ups da Fase 3 (2026-06-23)
- **Marcar falso-positivo** a partir de um sinal de VoC: a tabela `risk_curation_feedback.source` tem CHECK só `alert|assessment`; precisa ampliar o enum (ou criar caminho próprio) para registrar falso-positivo de sentimento.
- **Tie-ins** do índice VoC com o **health-score** (componente de sentimento) e com o **RAG/Perguntar** (contexto por conta) — ainda não ligados.

### Read.ai — lacunas conhecidas (2026-06-23)
- **Webhook não traz `metrics.sentiment`** (só o REST/expand traz). Reuniões que chegam só por webhook ficam sem sentimento até um fetch REST. Fechar o gap (enfileirar fetch leve de métricas no webhook).
- `metrics.read_score`/engagement do Read.ai **não são persistidos** (só `sentiment`). Poderiam ir em `interactions.meta`.

### Código morto / inconsistências (2026-06-23)
- [voc-service.ts](../../src/lib/voc/voc-service.ts): fetchers legados (`/api/voc/trends`, `/themes`, `/quotes`, `/sentiment`) apontam para **endpoints que não existem** (404). Remover ou religar.
- `interactions.quotes` (coluna jsonb) criada por migração mas **nunca populada/usada**. Decidir: usar (citações por reunião) ou remover.
- Normalização de temas de VoC é por **dicionário** (`voc_theme_synonyms`) — sem clustering por IA. Evolução possível (assíncrona) para agrupar temas semelhantes melhor.

## ✅ Resolvidos
- (2026-06-23) Read.ai não importava transcrição — contrato REST errado (`expand[]` + shape `turns/text`). Corrigido.
- (2026-06-23) Overflow de `numeric` (duração/sentiment) abortava ingest do Read.ai. Corrigido (clamp).
- (2026-06-23) Backfill do Read.ai travava (estado salvo só no fim) e estourava o tempo. Corrigido (cursor por página + orçamento por reunião + piso `backfill_from`).
