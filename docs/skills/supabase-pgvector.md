# Supabase + pgvector Best Practices

## Referências Oficiais
- [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search)
- [RAG with Permissions (RLS)](https://supabase.io/docs/guides/ai/rag-with-permissions)
- [pgvector Docs](https://github.com/pgvector/pgvector)

## Setup pgvector

### Habilitar extensão
```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
```

### Criar tabela de embeddings
```sql
CREATE TABLE embeddings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  embedding VECTOR(768),  -- 768 dimensões (Ollama nomic-embed-text)
  account_id UUID REFERENCES accounts(id),
  chunk_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índice HNSW (recomendado para <1M vetores)
```sql
CREATE INDEX embeddings_hnsw_idx ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Similarity Search

### Função de busca (Recomendado)
```sql
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 15,
  filter_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  similarity FLOAT,
  account_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity,
    e.account_id
  FROM embeddings e
  WHERE (
    filter_account_id IS NULL
    OR e.account_id = filter_account_id
  )
  AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## RAG Pipeline

### Chunking (Estratégia)
```
recommended: semantic chunking (15-20% better accuracy)
- Quebre por páragrafos lógicos
- Mantenha 20% overlap mínimo
- Tamanho ideal: 1000-4000 caracteres
```

### Embedding
```typescript
// Ollama (local)
const response = await fetch('http://localhost:11434/api/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'nomic-embed-text',
    prompt: text
  })
});
const { embedding } = await response.json();

// Gemini (fallback)
const result = await genAI.getGenerativeModel({
  model: 'gemini-embedding-2-preview',
  taskType: 'RETRIEVAL_DOCUMENT'
}).embedContent(text);
// Redimensionar para 768 se necessário
```

### HyDE (Hypothetical Document Embedding)
```typescript
// Gere resposta hipotética primeiro, depois embedded
// Melhora recall para queries complexas
const hypothetical = await llm.generate(
  'Resuma a resposta para: ' + query
);
const queryEmbedding = await embed(hypothetical);
const chunks = await similaritySearch(queryEmbedding);
```

## Row-Level Security (RLS)

### Políticas por tabela
```sql
-- Habilitar RLS
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Política: CSM só vê dados das suas contas
CREATE POLICY "embeddings_csm_policy" ON embeddings
FOR SELECT
USING (
  account_id IN (
    SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
  )
);
```

### Service Role (bypass RLS)
```typescript
// lib/supabase/admin.ts (server-side)
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

## Referências Adicionais
- [Echo Algoridata - RAG Systems Guide](https://www.echoalgoridata.no/en/blog/rag-systems-supabase-guide)
- [Claude Lab - Claude + Supabase Production](https://claudelab.net/en/articles/api-sdk/claude-api-supabase-pgvector-realtime-ai-app)
- [Supabase Docs - Vector Search](https://supabase.com/docs/guides/ai/examples/nextjs-vector-search)