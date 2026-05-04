# Decisões de Schema — Pré-requisitos antes da Fase 1

**Status:** ⏳ Pendente aprovação de Vinicius

Essas 4 decisões são **irreversíveis** ou caras de mudar depois. Precisam ser tomadas **antes de qualquer card de F1 começar**, não durante.

---

## Decisão 1: Schema Canônico de Filtros Serializados

**Pergunta:** Como representamos filtros compostos persistidos em `saved_views` e reutilizáveis em Segmentação (F2), Playbooks (F3) e Analytics (F4)?

### Opção A: JSONB livre (recomendado)
```sql
saved_views (
  id uuid, user_id uuid, name text,
  filters jsonb -- estrutura livre, validada em app
)

-- Exemplo de filters:
{
  "operator": "AND",
  "conditions": [
    { "field": "status", "op": "eq", "value": "open" },
    { "field": "priority", "op": "in", "values": ["critical", "high"] },
    { "field": "updated_at", "op": "gt", "value": "2026-04-15T00:00:00Z" }
  ]
}
```

**Vantagem:** Flexível para qualquer entidade (tickets, contas, playbooks). Validação em TypeScript.
**Desvantagem:** Sem validação de schema em SQL, risco de dados malformados.

### Opção B: Enum de filtros pré-definidos
```sql
-- Em vez de JSONB, um tipo enum ou tabela de filtros conhecidos
CREATE TYPE ticket_filter_type AS ENUM (
  'status_is', 'priority_is', 'assigned_to', 'sla_at_risk', ...
);
```

**Vantagem:** Segurança, sem surpresas.
**Desvantagem:** Inflexível, quebra quando adicionar novo filtro em F3/F4.

### Decisão
**→ Opção A (JSONB livre)** — mais aderente ao padrão dinâmico de segmentação em F2 e filtros em F3/F4.

**Arquivo:** Criar `src/lib/schemas/filter.schema.ts` com Zod que valida a estrutura do JSONB.

---

## Decisão 2: Modelo de Embedding Padrão

**Pergunta:** Qual modelo de embedding usamos para busca semântica (F1), detecção de duplicata (F1) e RAG "O que responder?" (F1)?

### Opção A: Gemini `text-embedding-004` (dimensão 768, já em uso no RAG)
- ✅ Já em uso no projeto para RAG
- ✅ Consistente com LLM provider Gemini 2.5 Flash
- ✅ Dimensão 768 compatível com pgvector nativo
- ⚠️ Dependência de API Gemini, custo por embedding

### Opção B: Open-source via Ollama (se disponível locally)
- ✅ Sem custos por embedding
- ✅ Rápido se local
- ⚠️ Requer manutenção de Ollama
- ⚠️ Pode divergir da qualidade do Gemini

### Decisão
**→ Opção A (Gemini `text-embedding-004`)** — consistência com RAG existente, custo aceitável, dimensão padrão 768.

**Arquivo:** Criar `src/lib/embeddings.ts`:
```typescript
export const EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS = 768;

export async function embedText(text: string): Promise<number[]> {
  // call Gemini API via gateway
}
```

**Implicação schema:** Coluna `embedding vector(768)` em `support_tickets`, `interactions`, e futuramente em `nps_responses`.

---

## Decisão 3: Tabela de Auditoria de Eventos — Ticket Events

**Pergunta:** Como rastreamos todos os eventos que acontecem num ticket (reopen, merge, escalonamento, auto-close)?

### Opção A: Tabela genérica `ticket_events`
```sql
ticket_events (
  id uuid primary key,
  ticket_id uuid references support_tickets(id),
  event_type text, -- 'reopened', 'merged', 'escalated', 'auto_closed', ...
  payload jsonb, -- dados específicos do evento
  triggered_by uuid references auth.users(id), -- null se "system"
  triggered_at timestamptz default now(),
  created_at timestamptz default now()
)
```

**Vantagem:** Única fonte de verdade para auditoria, escalável para novos eventos.
**Desvantagem:** Requer query JSONB para detalhe, mais storage.

### Opção B: Colunas específicas em `support_tickets`
```sql
-- Adicionar em support_tickets:
reopened_at, reopened_by, reopened_count, ...
merged_into_id, merged_at, merged_by, ...
escalated_at, escalated_by, ...
```

**Vantagem:** Simples, queries rápidas.
**Desvantagem:** Schema cresce infinitamente com cada novo evento, histórico perdido.

### Decisão
**→ Opção A (`ticket_events`)** — auditoria completa e escalável.

**Schema:**
```sql
CREATE TABLE ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ticket_events_ticket_id ON ticket_events(ticket_id);
CREATE INDEX idx_ticket_events_created_at ON ticket_events(created_at);
```

---

## Decisão 4: Estratégia de Background Jobs (Cron)

**Pergunta:** Como rodamos jobs periódicos (auto-close, urgency scoring, sentiment batch)?

### Opção A: Supabase `pg_cron` (se disponível)
```sql
-- Dentro do Supabase, adicionar extensão pg_cron
SELECT cron.schedule('auto-close-tickets', '*/5 * * * *', 'SELECT auto_close_expired_tickets()');
```

**Vantagem:** Nativo no Supabase, sem infra externa.
**Desvantagem:** Não executa em local (dev), requer SQL procedures.

### Opção B: Next.js Route Handler com Vercel Cron
```typescript
// src/app/api/cron/auto-close/route.ts
export async function POST(req) { ... }

// vercel.json
{ "crons": [{ "path": "/api/cron/auto-close", "schedule": "0 */6 * * *" }] }
```

**Vantagem:** Roda em qualquer provider Next.js, código TypeScript.
**Desvantagem:** Menos robusto que pg_cron para garantia de execução (depend de host).

### Opção C: Job queue separado (Bull, Inngest, etc)
- Overkill para o MVP, economia de tokens BMAD.

### Decisão
**→ Opção B (Next.js Route Handler com Vercel Cron)** — simples, TypeScript, já em uso no projeto para `sla-polling`.

**Pattern:**
```typescript
// src/app/api/cron/[job-name]/route.ts
export async function POST(req: Request) {
  // Verify x-api-secret header
  // Execute job
  // Return 200 on success
}
```

**Vercel.json:**
```json
{
  "crons": [
    { "path": "/api/cron/auto-close", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/urgency-score", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/sentiment-batch", "schedule": "0 */4 * * *" }
  ]
}
```

---

## Tabelas Novas Obrigatórias

Criar antes do primeiro card de F1:

### 1. `csm_queue_config`
```sql
CREATE TABLE csm_queue_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  max_concurrent_tickets int DEFAULT 20,
  is_available bool DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
```

### 2. `ticket_merge_history`
```sql
CREATE TABLE ticket_merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  secondary_ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  merged_at timestamptz DEFAULT now(),
  merged_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  CONSTRAINT different_tickets CHECK (primary_ticket_id != secondary_ticket_id)
);
```

### 3. `ticket_similarity_candidates`
```sql
CREATE TABLE ticket_similarity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_a_id uuid NOT NULL REFERENCES support_tickets(id),
  ticket_b_id uuid NOT NULL REFERENCES support_tickets(id),
  similarity_score float NOT NULL,
  detected_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending_review', -- 'confirmed_duplicate', 'dismissed'
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  CONSTRAINT different_tickets CHECK (ticket_a_id != ticket_b_id),
  UNIQUE (ticket_a_id, ticket_b_id)
);
```

### 4. `timeline_events`
```sql
CREATE TABLE timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  source_table text, -- 'support_tickets', 'nps_responses', 'interactions', etc
  source_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_timeline_events_account_id_occurred_at 
  ON timeline_events(account_id, occurred_at DESC);
```

### 5. `ticket_events`
(Vide decisão 3 acima)

---

## Checklist de Aprovação

- [ ] Decisão 1: Schema de filtros JSONB aprovado
- [ ] Decisão 2: Modelo Gemini `text-embedding-004` aprovado
- [ ] Decisão 3: Tabela `ticket_events` aprovada
- [ ] Decisão 4: Next.js Cron Route Handler aprovado
- [ ] Todas as 5 novas tabelas criadas em Supabase
- [ ] `src/lib/embeddings.ts` criado com constantes
- [ ] `src/lib/schemas/filter.schema.ts` criado com validação Zod

**Próximo passo:** Iniciar Onda 1 da Fase 1 com F1-01 Views Salvas.
