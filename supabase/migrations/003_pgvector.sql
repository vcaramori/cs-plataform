-- Sprint 3: pgvector — substitui Pinecone
-- Tabela unificada de embeddings com busca por similaridade

CREATE EXTENSION IF NOT EXISTS vector;

-- ==============================================================================
-- EMBEDDINGS (substitui Pinecone — chunks de interactions + support_tickets)
-- ==============================================================================
CREATE TABLE public.embeddings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  source_type  TEXT        NOT NULL CHECK (source_type IN ('interaction', 'support_ticket')),
  source_id    UUID        NOT NULL,
  chunk_index  INTEGER     NOT NULL DEFAULT 0,
  chunk_text   TEXT        NOT NULL,
  embedding    vector(768) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_embeddings_account_id ON public.embeddings (account_id);
CREATE INDEX idx_embeddings_source     ON public.embeddings (source_type, source_id);

-- RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM vê próprios embeddings"
  ON public.embeddings FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM insere próprios embeddings"
  ON public.embeddings FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM deleta próprios embeddings"
  ON public.embeddings FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- FUNÇÃO DE BUSCA POR SIMILARIDADE
-- Usada pelo RAG (/api/ask) e pelo Shadow Score (/api/health-scores/generate)
-- ==============================================================================
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding   vector(768),
  match_account_id  UUID    DEFAULT NULL,
  match_source_type TEXT    DEFAULT NULL,
  match_limit       INTEGER DEFAULT 8,
  match_threshold   FLOAT   DEFAULT 0.5
)
RETURNS TABLE (
  id          UUID,
  account_id  UUID,
  source_type TEXT,
  source_id   UUID,
  chunk_index INTEGER,
  chunk_text  TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.account_id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    e.chunk_text,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.embeddings e
  WHERE
    (match_account_id  IS NULL OR e.account_id  = match_account_id)
    AND (match_source_type IS NULL OR e.source_type = match_source_type)
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
