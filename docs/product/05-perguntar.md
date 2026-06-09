# 5. Perguntar — Assistente Estratégico RAG

## Visão Geral do Módulo

O **Perguntar** é um assistente de Q&A baseado em RAG (Retrieval-Augmented Generation) que permite aos CSMs fazer perguntas estratégicas sobre suas contas. O sistema busca em interações e tickets para gerar respostas contextualizadas.

**Caminho:** `/perguntar`

---

## 1.1 Regras de Negócio

| Regra | Descrição |
|------|-----------|
| **account_id** | Opcional — se vazio, busca em todas as contas do CSM |
| **Fontes** | `interactions` + `tickets` (tabelas do Supabase) |
| **Similarity Threshold** | ≥ 0.7 para considerar fonte relevante |
| **Max Sources** | Máximo 4 fontes retornados por busca |
| **Embedding** | Modelo de embedding configurado no LLM Gateway |
| **LLM** | Resposta gerada via gateway com fallback |

### Pipeline RAG

```
1. [Pergunta do usuário]
2. [Gera embedding da pergunta]
3. [Similarity search em interactions + tickets]
4. [Filtra por similarity ≥ 0.7 (fallback: 0.35 se < 2 resultados)]
5. [Limita a top K resultados (configurável)]
6. [Busca paralela de contexto estruturado — 14 fontes]
7. [Constrói contexto com todos os blocos]
8. [Envia para LLM com system instruction]
9. [Retorna resposta + fontes]
```

### Fontes de Contexto Estruturado (14 blocos)

| # | Fonte | Escopo |
|---|-------|--------|
| 0 | Interactions (semântica) | conta ou portfólio |
| 1 | Support tickets (semântica) | conta ou portfólio |
| 2 | Feature adoption | conta |
| 3 | Account plan summary + risco | conta |
| 4 | Portfolio summary | portfólio |
| 5 | Contacts / power map | conta |
| 6 | All accounts (entity detection) | portfólio |
| 7 | NPS responses | conta |
| 8 | Time entries (effort journal) | conta |
| 9 | Health scores (manual vs shadow) | conta |
| 10 | Contracts (todos os status, mais recente primeiro) | conta |
| 11 | Account playbooks | conta |
| 12 | SLA violations | conta |
| 13 | Proactive alerts ativos (não resolvidos) | conta ou portfólio |

### Classificação de Risco Comercial

O pipeline distingue automaticamente dois tipos de risco:

| Condição | Classificação |
|----------|--------------|
| Contrato vencido/inativo + adoção 0% | **CHURN** (cancelamento total) |
| Adoção parcial + funcionalidades diferenciadas não usadas | **DOWNGRADE** (migração de plano) |
| Adoção parcial + renovação próxima (≤90 dias) | **DOWNGRADE com urgência** |

---

## 1.2 Componentes Visuais

### Header
- Breadcrumb: "Dashboard > Perguntar"
- Título: "Assistente Estratégico"

### ScopeSelector
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Escopo | Select | Não | "Todas as minhas contas" ou conta específica |

### QuestionInput
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Pergunta | Textarea | Sim | Pergunta estratégica (ex: "Qual o principal desafio desse cliente?") |

### SourcesList
| Coluna | Descrição |
|--------|-----------|
| Tipo | "interaction" ou "ticket" |
| Data | Data da criação |
| Trecho | Preview do conteúdo (primeiros 100 chars) |
| Similarity | Score de similaridade |

### ResponseCard
- Resposta do LLM em formato markdown
- Lista de fontes citáveis

### Estados
| Estado | Exibe |
|--------|------|
| carregando | spinner + "Buscando informações..." |
| vazio | "Nenhuma informação encontrada" |
| erro | mensagem de erro |

---

## 1.3 Fluxo de Dados

```
[Usuário acessa página]
    ↓
[Renderiza interface]
    ↓
[Usuário digita pergunta]
    ↓
[Carrega escopo (account_id opcional)]
    ↓
[Envia para API /api/rag]
    ├─ Gera embedding
    ├─ Similarity search
    ├─ Filtra threshold
    ├─ Limita 4 resultados
    └─ Chama LLM
    ↓
[Renderiza resposta + fontes]
```

---

## 1.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Selecionar escopo | Clique no select | Define escopo da busca |
| Digitar pergunta | Digitação no textarea | Armazena pergunta |
| Enviar pergunta | Clique em "Perguntar" | Executa pipeline RAG |
| Visualizar fonte | Clique no item | Abre modal com conteúdo completo |
| Limpar | Clique em "Limpar" | Reseta interface |

---

## 1.5 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — redireciona para `/login` se não autenticado

### Dados
- **Fontes:** `interactions`, `support_tickets`, `feature_adoption`, `contracts`, `contacts`, `nps_responses`, `time_entries`, `health_scores`, `account_playbooks`, `sla_events`, `proactive_alerts`
- **RLS:** account_id deve pertencer ao CSM logado
- **Contratos:** todos os status incluídos (não apenas `active`) — expirados e churned são visíveis para a IA

### API
- Endpoint: `/api/rag`
- Método: POST
- Body: `{ question: string, account_id?: string }`
- Response: `{ answer: string, sources: Source[] }`

---

## 1.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Sem fontes relevantes | Exibe "Não encontrei informações" |
| Timeout no LLM | Exibe erro com retry |
| Pergunta vazia | Desabilita botão de enviar |
| account_id inválido | Retorna 403 |

---

## 1.6 Resiliência da ingestão, modelos livres e chunking

### Resiliência (reprocessar itens faltantes)
A ingestão no RAG é *best-effort*: se o provedor de embedding falhar (ex.: sem créditos), o registro **não é vetorizado** e ficaria invisível no Perguntar. Para contornar:

- **"Faltante" = registro de origem sem linha em `embeddings`** (cobre tanto nunca-tentado quanto falha). Não há coluna de status; a detecção é por ausência.
- **`reembedMissing()`** ([src/lib/rag/reembed.ts](src/lib/rag/reembed.ts)) reprocessa os faltantes de todas as fontes: `interaction`, `support_ticket`, `nps_response`, `onboarding`, `negotiation`. Idempotente.
- **Botão "Reprocessar RAG (itens faltantes)"** em **Admin → IA** → `POST /api/admin/reembed-missing` (admin-gated). Uso típico após falha/sem-créditos.
- **Cron `/api/cron/reembed-missing`** (catch-up automático): agendado em `vercel.json` (diário, 06:00 UTC). Auth aceita `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) **ou** header `x-api-secret == API_SECRET` (agendador externo / manual).
- **"Re-indexar todos os embeddings"**: operação pesada — **apaga tudo** e regenera (usar só ao trocar modelo/dimensão de embedding ou tamanho de chunk).
- **Tickets abertos por fato**: o pipeline injeta os tickets abertos da conta buscados **direto do banco** (não via embeddings), então "tem ticket aberto?" responde mesmo sem o embedding existir.

### Modelos livres (Gemini 3 / 3.5 / qualquer)
Os campos **Modelo de Texto** e **Modelo de Embedding** (Admin → IA) são **campo livre com sugestões** (combobox) — aceitam qualquer model id atual/futuro (`gemini-3-pro`, `gemini-flash-latest`, etc.). O gateway repassa o id direto à API.
- Trocar **texto** = imediato (RAG/LLM passam a usar).
- Trocar **embedding** com dimensão diferente exige **Re-indexar** (a coluna `embeddings` é `vector(N)`; o fallback de embedding **deve** gerar a mesma dimensão).

### Chunking (configurável no banco)
- **Tamanho do chunk** e **sobreposição** (tokens) são editáveis em **Admin → IA → Parâmetros RAG** e persistem em `app_settings.rag_ai_settings` (`chunk_size`, `chunk_overlap`). Default **1024 / 128** (env `CHUNK_SIZE`/`CHUNK_OVERLAP` é apenas fallback).
- Mantenha o chunk **≤ 2048** (teto de tokens do embedding Gemini). Reuniões longas são fatiadas em vários chunks automaticamente — não há perda por tamanho.
- Após mudar o chunk, rode **"Re-indexar todos os embeddings"** para regenerar.

> **Pinecone removido**: o RAG usa exclusivamente **pgvector**. Colunas `pinecone_vector_id` (interactions/support_tickets) e variáveis `PINECONE_*` foram eliminadas.

---

## 1.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |
| Mai/2026 | Correção crítica: contratos expirados/churned agora visíveis para IA (removido filtro `status=active`); alertas ativos (`proactive_alerts`) adicionados ao contexto; classificação CHURN vs DOWNGRADE implementada; campos `seniority`/`departed_at` adicionados ao power map; `getPortfolioSummary` inclui contas com contratos expirados em `at_risk_accounts` |
| Jun/2026 | Resiliência da ingestão (reprocessar faltantes via botão + cron `reembed-missing` agendado em `vercel.json`); modelos de texto/embedding livres (combobox, Gemini 3/3.5/qualquer); chunk size/overlap configuráveis no banco (default 1024/128); tickets abertos injetados por fato; Pinecone removido (pgvector apenas) |