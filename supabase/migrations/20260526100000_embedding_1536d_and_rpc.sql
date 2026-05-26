-- Migration: Upgrade embeddings to 1536 dimensions + create alter_embedding_dimension RPC
-- This allows dynamic dimension changes from Admin UI when switching embedding providers

-- 1. Alter embeddings table to 1536 dimensions
ALTER TABLE embeddings
  ALTER COLUMN embedding TYPE vector(1536);

-- 2. Update the match_embeddings function signature to use 1536d
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Create RPC for dynamic dimension changes (used by reindex-embeddings endpoint)
CREATE OR REPLACE FUNCTION alter_embedding_dimension(new_dimension int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(%s)', new_dimension);

  EXECUTE format('
    CREATE OR REPLACE FUNCTION match_embeddings(
      query_embedding vector(%s),
      match_threshold float DEFAULT 0.4,
      match_count int DEFAULT 5
    )
    RETURNS TABLE (
      id uuid,
      source_type text,
      source_id uuid,
      content text,
      metadata jsonb,
      similarity float
    )
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      RETURN QUERY
      SELECT
        e.id,
        e.source_type,
        e.source_id,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
      FROM embeddings e
      WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $fn$;
  ', new_dimension, new_dimension);
END;
$$;
