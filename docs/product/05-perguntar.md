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
4. [Filtra por similarity ≥ 0.7]
5. [Limita a top 4 resultados]
6. [Constrói contexto]
7. [Envia para LLM com prompt]
8. [Retorna resposta + fontes]
```

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
- **Fonte:** `interactions`, `tickets`
- **RLS:** account_id deve pertencer ao CSM logado

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

## 1.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |