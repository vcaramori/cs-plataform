# Análise Técnica: Migração Backend para C# + SQL Server

> **Data:** Abril 2026  
> **Autor:** Vinicius Caramori  
> **Status:** Análise — não aprovada para execução

---

## 1. Estado Atual da Stack

| Camada | Tecnologia | Acoplamento |
|---|---|---|
| API Backend | Next.js 16 App Router (28 rotas TypeScript) | Alto — monolito full-stack |
| Auth + RLS | Supabase Auth (JWT + PostgreSQL RLS) | Crítico |
| Banco relacional | PostgreSQL via Supabase | Alto |
| Banco vetorial | **pgvector no Supabase** (tabela `embeddings`, RPC `search_embeddings`) | Crítico |
| Embeddings | Gemini `text-embedding-004` (768 dims) + Ollama `nomic-embed-text` fallback | Médio |
| LLM | Ollama local (qwen2.5:1.5b) + Gemini + Claude SDK | Baixo |
| Storage | Supabase Storage | Médio |
| Frontend | Next.js 16 React + shadcn/ui + Tailwind | Não migra |

> **Importante:** O banco vetorial é o próprio PostgreSQL com extensão pgvector — **não há Pinecone** na stack atual. A busca semântica (RAG pipeline) depende inteiramente do operador `<=>` do pgvector e da função RPC `search_embeddings`.

---

## 2. O Que a Migração Realmente Significa

Não se trata de "migrar o backend". São **5 sistemas distintos** que precisariam ser reescritos do zero:

1. As 28 rotas de API (`/api/**`) → ASP.NET Core controllers/Minimal APIs
2. Todo o layer de auth (Supabase Auth → ASP.NET Identity / Azure AD B2C)
3. Todas as RLS policies PostgreSQL → SQL Server Security Predicates
4. A busca vetorial pgvector → **sem equivalente direto em SQL Server padrão** (ver seção 3.3)
5. Supabase Storage → Azure Blob Storage ou equivalente

---

## 3. Análise Detalhada por Subsistema

### 3.1 Backend API (Next.js → C#)

**Prós:**
- ASP.NET Core Minimal APIs tem performance superior para cargas CPU-bound (benchmarks TechEmpower)
- Entity Framework Core é mais maduro que qualquer ORM JavaScript para SQL Server
- Tipagem estática nativa sem depender de TypeScript
- Ecossistema enterprise consolidado — fácil contratar, documentação excelente
- Melhor integração com ferramentas Microsoft (se a empresa já usa Azure)

**Contras:**
- O codebase atual compartilha **tipos TypeScript entre frontend e API** (ex: `EmbeddingSearchResult`, `RAGResult`, tipos de `supabase/types.ts`). Com C# no backend, essa ponte some — é necessário gerenciar dois mundos de tipos ou adicionar um pipeline de codegen (OpenAPI + NSwag/Kiota) com custo de manutenção contínuo.
- O `supabase-csharp` (SDK oficial) é significativamente menos maduro que o `supabase-js`. Recursos como Auth helpers, Storage client e RPC calls têm cobertura incompleta e bugs documentados.
- Cada rota Next.js é co-localizada com o frontend no mesmo processo. Separar em serviço externo adiciona CORS, um hop de rede e gestão de deploy independente.

**Impedimento: Baixo** — C# pode fazer tudo que o backend TypeScript faz, com esforço equivalente a uma reescrita completa (não incremental).

---

### 3.2 Banco Relacional (PostgreSQL → SQL Server)

**Schema atual:** `accounts`, `contracts`, `contacts`, `interactions`, `time_entries`, `support_tickets`, `health_scores`, `embeddings` — mais funções SQL como `search_embeddings`.

**Prós:**
- SQL Server tem ferramentas de BI maduras (SSRS, Power BI integrado)
- Entity Framework Core 8+ tem suporte excelente
- Se a empresa já tem licença SQL Server Enterprise, custo marginal zero
- Recursos de HA nativos (Always On, Log Shipping)

**Contras:**
- **Row Level Security é sintaticamente diferente.** O Supabase usa `auth.uid()` dentro das policies PostgreSQL de forma transparente com o JWT da sessão. SQL Server implementa RLS via `SECURITY POLICY` + funções de predicado + `SESSION_CONTEXT` — é reescrita total, não portabilidade.
- Supabase gera e versiona migrations automaticamente. É necessário montar um pipeline equivalente (EF Core Migrations, DbUp ou Flyway).
- UUIDs são usados como PK em todas as tabelas. SQL Server tem `uniqueidentifier` — compatível, mas a geração e indexação têm comportamento diferente e podem causar fragmentação de índice se não configurados corretamente.
- A função RPC `search_embeddings` usa operadores pgvector nativos (`<=>` para cosine similarity). **Isso não existe em SQL Server padrão.**

**Impedimento: Médio** — Portável, com custo alto de reescrita de policies e funções SQL.

---

### 3.3 Banco Vetorial (pgvector → SQL Server) — Impedimento Crítico

Este é o ponto que **bloqueia** a migração para SQL Server puro.

**Implementação atual:**

```sql
-- Função RPC no Supabase (PostgreSQL + pgvector)
SELECT * FROM search_embeddings(
  query_embedding := '[0.12, -0.34, ...]'::vector(768),
  match_threshold := 0.4,
  match_limit    := 8
);
-- Internamente usa: embedding <=> query_embedding (cosine distance)
-- Com índice HNSW ou IVFFlat para busca ANN eficiente
```

```typescript
// src/lib/supabase/vector-search.ts
await supabase.rpc('search_embeddings', {
  query_embedding: queryEmbedding, // float[] de 768 dimensões
  match_threshold: 0.4,
  match_limit: 8,
})
```

**SQL Server padrão (2019, 2022): não tem suporte nativo a vetores.** Não existe tipo `vector`, não existe operador de similaridade, não existe índice ANN.

**Alternativas avaliadas:**

| Opção | Viabilidade | Custo | Caveats |
|---|---|---|---|
| **Azure SQL Database** (feature `VECTOR` em preview) | Possível | PaaS Azure, custo por DTU/vCore | Feature em preview em Abril 2026 — não production-ready |
| **SQL Server 2025** (vector em roadmap) | Possível | Licença nova + upgrade de infra | Ainda sem GA confirmado |
| **CLR Integration** (C# no SQL Server para cosine sim.) | Tecnicamente possível | Altíssima complexidade | Performance muito inferior a índices vetoriais nativos |
| **Manter pgvector separado** (dois bancos) | Possível | Complexidade operacional | Contradiz o objetivo da migração |
| **Pinecone / Qdrant / Weaviate** (vector store externo) | Possível | Custo adicional de infra | Também contradiz a consolidação no SQL Server |

**Impedimento: Bloqueante** — Sem Azure SQL com feature vector ou SQL Server 2025 GA, a migração do banco vetorial não é viável sem introduzir um terceiro serviço.

---

### 3.4 Auth System

Supabase Auth usa PostgreSQL como store de usuários e propaga `auth.uid()` para as RLS policies. Toda a autorização depende disso:

```typescript
// Padrão repetido nas 28 rotas
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// RLS no banco garante que cada query já filtra pelo csm_owner_id automaticamente
```

Migrar para SQL Server exige escolher e implementar um dos seguintes:

- **ASP.NET Identity** — self-hosted, requer UI de login própria
- **Azure AD B2C** — PaaS, custo por MAU (Monthly Active User)
- **Keycloak** — open-source, infra adicional para manter

Em qualquer caso, todas as 28 rotas precisam ser reescritas para o novo sistema, e todas as RLS policies precisam ser reconstruídas como SQL Server Security Predicates.

**Impedimento: Alto** — É o subsistema com maior risco de regressão de segurança se feito com pressa.

---

## 4. Mapa de Impedimentos

| # | Impedimento | Severidade | Desbloqueio |
|---|---|---|---|
| 1 | pgvector não existe em SQL Server padrão | **Bloqueante** | Azure SQL vector (preview) ou aguardar SQL Server 2025 GA |
| 2 | Supabase Auth é PostgreSQL-nativo | Alto | Reescrever auth completo (ASP.NET Identity / Azure AD B2C) |
| 3 | RLS policies são PostgreSQL-specific | Alto | Reescrever como SQL Server Security Predicates |
| 4 | Tipos compartilhados TS frontend↔backend | Médio | Adicionar pipeline OpenAPI + NSwag/Kiota |
| 5 | supabase-csharp SDK é imaturo | Médio | Substituir por Npgsql / Dapper direto |
| 6 | 28 rotas API precisam ser reescritas | Médio | Esforço previsível mas extenso |
| 7 | Supabase Storage para uploads de transcrições e PDFs | Baixo | Azure Blob Storage |
| 8 | Sprints 3-6 pendentes seriam paralisadas | Alto (prazo) | Paralização total de features durante a migração |

---

## 5. Escopo Real da Migração

Uma migração completa sem perda de funcionalidade exigiria:

- [ ] Reescrita das 28 rotas de API em ASP.NET Core
- [ ] Reescrita de 8 libs de negócio (`rag-pipeline`, `vector-search`, `shadow-score`, `llm/gateway`, `gemini`, `adoption/risk-engine`, `health/*`, etc.)
- [ ] Novo sistema de autenticação completo
- [ ] Reescrita de todas as RLS policies
- [ ] Decisão e implementação do vector store (ponto mais crítico)
- [ ] Pipeline de database migrations novo
- [ ] Migração de arquivos do Supabase Storage
- [ ] Configuração de CORS entre frontend Next.js e backend C# separado
- [ ] Testes de regressão em cada endpoint e fluxo de auth

---

## 6. Quando Faz Sentido Migrar

**Faz sentido se:**
- A empresa já tem licença SQL Server Enterprise e infraestrutura Azure (Azure SQL Database com vector feature)
- O time responsável pela manutenção tem expertise em C#/.NET e não em TypeScript
- Há requisito de compliance ou integração que exige SQL Server (ex: Dynamics 365, Power BI Embedded, LGPD com auditoria SQL Server)
- Existe orçamento e prazo para um projeto de 3-4 meses sem entrega de features novas

**Não faz sentido se:**
- O objetivo é entregar as Sprints 3-6 (RAG, `/perguntar`, Shadow Score dependem diretamente de pgvector + Supabase)
- Não há decisão sobre onde rodar o vector store em SQL Server
- O time é pequeno — a complexidade operacional de dois serviços (frontend + API separada) dobra o overhead de deploy e debugging

---

## 7. Caminho Alternativo Recomendado

Se o objetivo de longo prazo é C# + SQL Server, a evolução incremental e de menor risco é:

### Fase 1 — Concluir Sprints 3-6 na stack atual
O RAG pipeline, a ingestão de transcrições e o Shadow Score dependem de pgvector. Qualquer migração antes da conclusão dessas sprints paralisa o roadmap.

### Fase 2 — Extrair backend como serviço C# (sem mudar o banco)
Criar uma ASP.NET Core Web API que consome o mesmo PostgreSQL/Supabase. O Next.js vira frontend puro chamando a API C#. Isso valida a stack sem tocar no banco ou no vector store.

### Fase 3 — Avaliar Azure SQL vector quando sair de preview
Estimativa: Q3-Q4 2026. Com o vector feature em GA no Azure SQL, a migração do banco vetorial se torna viável sem perder o RAG.

### Fase 4 — Migrar Auth e RLS
Com banco e API estabilizados, migrar o sistema de auth (Azure AD B2C ou ASP.NET Identity) e reescrever as Security Policies.

Esse caminho transforma uma migração de alto risco e bloqueante em uma evolução incremental e reversível em cada fase.

---

## 8. Referências Técnicas

- [pgvector — PostgreSQL Extension for Vector Similarity Search](https://github.com/pgvector/pgvector)
- [Azure SQL Database — Vector Support (Preview)](https://learn.microsoft.com/en-us/azure/azure-sql/database/vectors-overview)
- [ASP.NET Core Minimal APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis)
- [SQL Server Row-Level Security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security)
- [Entity Framework Core — SQL Server Provider](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/)
- [supabase-csharp SDK](https://github.com/supabase-community/supabase-csharp)
