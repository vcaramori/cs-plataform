# CS Platform — Roadmap de Execução (Sprints 3–6)

> Documento gerado em 2026-03-27.
> Sprints 1 e 2 já foram executadas. Este arquivo cobre as entregas pendentes.

---

## Contexto Geral

A plataforma tem como objetivo ser a "memória viva" do time de CS, cobrindo:

- **Master Data**: Contas, Contratos, Contatos (power map)
- **Ingestão de Esforço**: Reuniões (transcrições Read.ai) + Back-office (log em linguagem natural)
- **Ingestão de Suporte**: Upload de chamados via CSV ou texto
- **Health Score Híbrido**: Score manual do CSM + Shadow Score gerado por IA com alerta de discrepância
- **RAG**: Interface "Perguntar" para consultas em linguagem natural sobre o portfólio

**Stack:** Next.js 14 · Supabase (DB/Auth + pgvector) · Gemini API

> **Decisão arquitetural (2026-03-27):** Pinecone foi descartado em favor do pgvector nativo do Supabase.
> Justificativa: volume estimado < 100k vetores, custo zero adicional, consistência transacional e possibilidade de
> joins híbridos (vetor + relacional na mesma query SQL). O client Pinecone existente será removido na Sprint 3.

---

## Estado Atual (pós Sprint 3)

### Implementado

| Área | Sprint |
|---|---|
| Schema completo (accounts, contracts, contacts, interactions, time_entries, support_tickets, health_scores) | 1 |
| RLS Policies + Auth com Supabase + middleware | 1–2 |
| Dashboard com KPIs de portfólio | 2 |
| Cadastro e detalhe de Contas + Contratos + Power Map | 2 |
| CostToServeCard (componente + cálculo) | 2 |
| Sidebar com navegação completa | 2 |
| pgvector habilitado — tabela `embeddings` + índice HNSW + `search_embeddings()` | 3 |
| Pinecone removido — `src/lib/supabase/vector-search.ts` implementado | 3 |
| `src/lib/gemini/parse-time-entry.ts` — NLP de tempo em linguagem natural | 3 |
| `GET/POST /api/time-entries` | 3 |
| `GET/POST /api/interactions` | 3 |
| `POST /api/interactions/[id]/ingest` — chunking + embedding + sentimento | 3 |
| Página `/esforco` — log de esforço indireto com IA | 3 |
| `TranscriptUploadModal` — upload de transcrição Read.ai com feedback de sentimento | 3 |

| Página `/suporte` — upload de chamados CSV/texto | **Entregue (Sprint 4)** |
| `GET/POST /api/support-tickets` + `POST /api/support-tickets/ingest` | **Entregue (Sprint 4)** |
| Shadow Health Score + alerta de discrepância | **Entregue (Sprint 5)** |
| `POST /api/health-scores/generate` + `GET /api/health-scores/[account_id]` | **Entregue (Sprint 5)** |
| Página `/perguntar` — interface RAG | **Entregue (Sprint 6)** |
| `POST /api/ask` — pipeline RAG completo | **Entregue (Sprint 6)** |

---

## Status Final — Todas as Sprints Concluídas ✓

Plataforma completa. Consultar `TESTES.md` para os 26 cenários de teste documentados.

---

## Decisão Técnica — Vector Store: pgvector (Supabase)

> **Decisão (2026-03-27):** Pinecone descartado em favor do pgvector nativo do Supabase.
> Volume estimado < 100k vetores. Benefícios: custo zero adicional, consistência transacional,
> joins híbridos vetor + relacional em uma única query SQL.

### Por que pgvector e não Pinecone

| Critério | Pinecone | pgvector (escolhido) |
|---|---|---|
| Custo | $70+/mês | Incluído no Supabase |
| Serviços na arquitetura | 3 (Next + Supabase + Pinecone) | 2 (Next + Supabase) |
| Joins vetor + relacional | Impossível em uma query | Nativo via SQL |
| Consistência transacional | Nenhuma | Total |
| Performance no volume estimado (<100k vetores) | Ótima | Ótima (HNSW index) |

### Migration necessária no Supabase (Sprint 3)

```sql
-- supabase/migrations/003_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE interactions     ADD COLUMN embedding vector(768);
ALTER TABLE support_tickets  ADD COLUMN embedding vector(768);

CREATE INDEX ON interactions    USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON support_tickets USING hnsw (embedding vector_cosine_ops);
```

### Embeddings Gemini

**Modelo:** `text-embedding-004` · **Dimensões:** `768`

| Parâmetro | Valor |
|---|---|
| Modelo | `text-embedding-004` |
| Dimensionalidade | `768` |
| task_type (ingestão) | `RETRIEVAL_DOCUMENT` |
| task_type (query RAG) | `RETRIEVAL_QUERY` |
| Chunk size | 512 tokens |
| Chunk overlap | 50 tokens |
| Tokenizador | `gpt-tokenizer` (já instalado) |

### Estratégia de Busca com pgvector

Os vetores ficam diretamente nas tabelas relacionais. Filtros são SQL normal combinados com similaridade de cosseno:

```sql
-- Busca semântica filtrada por conta
SELECT i.id, i.title, i.transcript_text, i.date,
       1 - (i.embedding <=> $query_vector) AS similarity
FROM interactions i
WHERE i.account_id = $account_id
  AND 1 - (i.embedding <=> $query_vector) > 0.75
ORDER BY similarity DESC
LIMIT 8;

-- Busca híbrida: semântica + relacional (ex: Shadow Score)
SELECT a.name, a.health_score, i.title,
       1 - (i.embedding <=> $query_vector) AS similarity
FROM interactions i
JOIN accounts a ON i.account_id = a.id
JOIN contracts c ON c.account_id = a.id
WHERE c.mrr > 10000
  AND a.health_score < 50
ORDER BY similarity DESC
LIMIT 20;
```

**Arquivo a criar:** `src/lib/supabase/vector-search.ts`
**Arquivo a remover:** `src/lib/pinecone/client.ts` (Sprint 3)

---

## Sprint 3 — Ingestão de Esforço

**Objetivo:** O time consegue registrar todo o esforço gasto em cada conta — reuniões e back-office.

**Estimativa:** 1 sessão de implementação

---

### 3.1 — Página `/esforco`

**Arquivo:** `src/app/(dashboard)/esforco/page.tsx`

**Funcionalidades:**
- Formulário com seletor de conta (dropdown com todas as contas do CSM)
- Campo de texto livre para log em linguagem natural
  - Exemplo: *"Passei 2h preparando material de QBR para Empresa X"*
  - IA parseia: `{ account_id, type, duration_minutes, description }`
- Botão de submit que chama `POST /api/time-entries`
- Tabela de entradas recentes com colunas: Conta · Tipo · Duração · Data · Descrição
- Totalizador de horas por conta no período (semana/mês)

**Tipos aceitos (`time_entry_type`):**
- `preparation` — Preparação de material
- `analysis` — Análise de ambiente / dados
- `strategy` — Planejamento e estratégia
- `reporting` — Geração de relatórios
- `internal_meeting` — Reunião interna

---

### 3.2 — Upload de Transcrição Read.ai

**Arquivo:** novo componente em `src/app/(dashboard)/accounts/[id]/components/TranscriptUploadModal.tsx`

**Funcionalidades:**
- Modal acessível pelo botão "Nova Reunião" na página da conta
- Campo para data da reunião
- Textarea para colar o texto da transcrição (ou upload de .txt)
- Preview do número de tokens detectados
- Submit chama `POST /api/interactions` seguido de `POST /api/interactions/[id]/ingest`

**Pipeline de ingestão:**
1. Salvar interaction no Supabase com `type: 'meeting'`, `direct_hours` extraído
2. Dividir transcrição em chunks de 512 tokens com 50 tokens de overlap
3. Gerar embedding de cada chunk via Gemini (`RETRIEVAL_DOCUMENT`)
4. Salvar cada chunk + embedding na coluna `embedding vector(768)` da tabela `interactions`

---

### 3.3 — APIs da Sprint 3

#### `POST /api/time-entries`
```
Body: { account_id?, raw_text, csm_id }
- Chama Gemini para parsear raw_text
- Retorna: { account_id, type, duration_minutes, description, parsed_date }
- Salva em time_entries
```

#### `POST /api/interactions`
```
Body: { account_id, type, date, title, transcript_text, participants? }
- Salva interaction no Supabase
- Extrai direct_hours do texto via Gemini
- Retorna: { interaction_id }
```

#### `POST /api/interactions/[id]/ingest`
```
- Busca interaction pelo ID
- Chunking + embedding via Gemini
- Salva embedding diretamente na coluna embedding da tabela interactions (pgvector)
```

---

## Sprint 4 — Ingestão de Suporte

**Objetivo:** Centralizar histórico de chamados para que o RAG tenha contexto técnico por conta.

**Estimativa:** 1 sessão de implementação

---

### 4.1 — Página `/suporte`

**Arquivo:** `src/app/(dashboard)/suporte/page.tsx`

**Funcionalidades:**
- Aba 1 — **Lista de Tickets**: tabela com filtros por conta, status e prioridade
- Aba 2 — **Importar**: upload de chamados

**Upload aceita dois formatos:**

**CSV** com colunas:
```
account_name, title, description, status, priority, category, opened_at, resolved_at
```

**Texto livre** (um ticket por bloco separado por linha em branco):
```
Título: Erro na integração de pagamento
Descrição: Cliente relata falha no webhook...
Status: open
Prioridade: high
```

**Fluxo:**
1. Usuário cola CSV ou texto
2. Sistema faz preview com N registros detectados
3. Usuário confirma
4. `POST /api/support-tickets/ingest` processa tudo em batch

---

### 4.2 — Pipeline de Vectorização de Tickets

1. Para cada ticket: concatenar `title + description` como texto a embedar
2. Gerar embedding via Gemini (`RETRIEVAL_DOCUMENT`)
3. Salvar embedding na coluna `embedding vector(768)` da tabela `support_tickets` (pgvector)
4. Filtros de busca disponíveis via SQL: `account_id`, `priority`, `status`, `opened_at`

---

### 4.3 — APIs da Sprint 4

#### `GET /api/support-tickets`
```
Query params: account_id?, status?, priority?
Retorna: lista paginada de tickets
```

#### `POST /api/support-tickets`
```
Body: { account_id, title, description, status, priority, category, opened_at }
Cria ticket único + vectoriza
```

#### `POST /api/support-tickets/ingest`
```
Body: { format: "csv" | "text", content: string, account_id? }
- Parseia CSV ou texto
- Resolve account_id por nome (busca na tabela accounts)
- Batch: salva no Supabase + gera embeddings + salva na coluna embedding (pgvector)
- Retorna: { created: N, errors: [] }
```

---

## Sprint 5 — Shadow Health Score + Alertas

**Objetivo:** A IA gera um score independente e compara com a avaliação manual do CSM. Discrepâncias são destacadas.

**Estimativa:** 1 sessão de implementação

---

### 5.1 — Lógica do Shadow Score

**Arquivo:** `src/lib/health/shadow-score.ts`

**Algoritmo:**
1. Buscar via pgvector as **20 interações + tickets mais recentes** da conta ordenados por data
2. Usar similaridade de cosseno para selecionar os mais relevantes para contexto de risco
3. Montar prompt para Gemini Pro com os chunks como contexto
4. Gemini retorna:
   ```json
   {
     "score": 72,
     "trend": "declining",
     "justification": "2 tickets críticos sem resolução + sentimento negativo na última reunião",
     "risk_factors": ["critical_tickets", "negative_sentiment"],
     "confidence": "high"
   }
   ```
5. Salvar em `health_scores` com `source: 'ai'`

**Trigger de geração:**
- Automático: ao ingerir nova transcrição ou novo batch de tickets
- Manual: botão "Recalcular Shadow Score" na página da conta

---

### 5.2 — Alerta de Discrepância

**Regra:** `|manual_score - shadow_score| > 20` → `discrepancy_alert: true`

**Onde aparece:**
- `AccountHeader` — badge laranja "Score em divergência" com tooltip explicando a diferença
- `AccountsTable` no Dashboard — ícone de alerta na coluna Health
- Filtro no Dashboard: "Mostrar contas com discrepância"

---

### 5.3 — APIs da Sprint 5

#### `POST /api/health-scores/generate`
```
Body: { account_id }
- Executa pipeline de shadow score
- Salva resultado em health_scores
- Verifica discrepância com score manual mais recente
- Retorna: { shadow_score, justification, discrepancy_alert }
```

#### `GET /api/health-scores/[account_id]`
```
Retorna:
{
  manual: { score, date, csm_notes },
  shadow: { score, trend, justification, risk_factors, confidence, date },
  discrepancy_alert: boolean,
  history: [ { date, manual_score, shadow_score }[] ]
}
```

#### `POST /api/health-scores`
```
Body: { account_id, score, notes }
Salva score manual do CSM
Verifica discrepância automaticamente
```

---

## Sprint 6 — RAG / "Perguntar"

**Objetivo:** O CSM faz perguntas em linguagem natural sobre qualquer conta ou sobre o portfólio inteiro.

**Estimativa:** 1 sessão de implementação

---

### 6.1 — Página `/perguntar`

**Arquivo:** `src/app/(dashboard)/perguntar/page.tsx`

**Funcionalidades:**
- Seletor de escopo: conta específica ou "Todo o Portfólio"
- Interface de chat (histórico de mensagens na sessão)
- Exemplos de perguntas exibidos no estado vazio:
  - *"Qual o maior problema técnico da Empresa X?"*
  - *"Quais contas tiveram tickets críticos este mês?"*
  - *"Qual foi o sentimento geral da última reunião com Empresa Y?"*
  - *"Quais contas têm mais horas indiretas que diretas?"*
- Resposta exibe **fontes** citadas (reunião de data X, ticket #Y)
- Streaming da resposta (Gemini stream API)

---

### 6.2 — Pipeline RAG

**Arquivo:** `src/lib/rag/pipeline.ts`

```
1. Receber pergunta + account_id? + csm_id
2. Embed da pergunta via Gemini (RETRIEVAL_QUERY)
3. Query pgvector (via src/lib/supabase/vector-search.ts):
   - Com account_id: WHERE account_id = $id ORDER BY embedding <=> $vec LIMIT 8
   - Sem account_id: JOIN accounts WHERE csm_id = $csm ORDER BY embedding <=> $vec LIMIT 8
4. Textos e metadados já vêm na mesma query (sem segunda viagem ao banco)
5. Montar prompt com contexto:
   - System: "Você é um assistente de CS. Use apenas as informações abaixo..."
   - Context: chunks formatados com fonte e data
   - User: pergunta original
6. Gemini Pro gera resposta com citações
7. Retornar resposta + metadados das fontes
```

---

### 6.3 — API da Sprint 6

#### `POST /api/ask`
```
Body: {
  question: string,
  account_id?: string,   // null = portfólio completo
  csm_id: string
}

Retorna: {
  answer: string,
  sources: [
    {
      type: "meeting" | "support_ticket",
      date: string,
      account_name: string,
      excerpt: string
    }
  ]
}
```

---

## Ordem de Prioridade

```
Sprint 3 → Sprint 4 → Sprint 5 → Sprint 6
```

**Justificativa:** Esforço e Suporte alimentam os vetores que Sprint 5 e 6 dependem.
Sem ingestão de dados, Shadow Score e RAG não têm contexto para operar.

---

## Arquivos a Criar por Sprint

### Sprint 3
```
src/app/(dashboard)/esforco/page.tsx
src/app/(dashboard)/accounts/[id]/components/TranscriptUploadModal.tsx
src/app/api/time-entries/route.ts
src/app/api/interactions/route.ts
src/app/api/interactions/[id]/ingest/route.ts
src/lib/gemini/parse-time-entry.ts
src/lib/supabase/vector-search.ts          ← substitui pinecone/client.ts
supabase/migrations/003_pgvector.sql       ← habilita extensão + colunas embedding + índices HNSW

REMOVER: src/lib/pinecone/client.ts
```

### Sprint 4
```
src/app/(dashboard)/suporte/page.tsx
src/app/api/support-tickets/route.ts
src/app/api/support-tickets/ingest/route.ts
src/lib/parsers/csv-tickets.ts
src/lib/parsers/text-tickets.ts
```

### Sprint 5
```
src/lib/health/shadow-score.ts
src/app/api/health-scores/route.ts
src/app/api/health-scores/generate/route.ts
src/app/api/health-scores/[account_id]/route.ts
```

### Sprint 6
```
src/app/(dashboard)/perguntar/page.tsx
src/lib/rag/pipeline.ts
src/app/api/ask/route.ts
```

---

*Fim do documento. Atualizar conforme cada sprint for executada.*
