import { TaskType } from '@google/generative-ai'
import { getEmbeddingModel } from '@/lib/gemini/client'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import { encode, decode } from 'gpt-tokenizer'
import type { EmbeddingSearchResult } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

export function chunkText(text: string): string[] {
  const { chunkSize, chunkOverlap } = env.chunking
  const tokens = encode(text)

  if (tokens.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0
  while (start < tokens.length) {
    const end = Math.min(start + chunkSize, tokens.length)
    chunks.push(decode(tokens.slice(start, end)))
    if (end >= tokens.length) break
    start += chunkSize - chunkOverlap
  }
  return chunks
}

// ---------------------------------------------------------------------------
// Embeddings via Gemini text-embedding-004
// ---------------------------------------------------------------------------

export async function generateEmbedding(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[]> {
  const model = getEmbeddingModel()
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType,
  })
  return result.embedding.values
}

// ---------------------------------------------------------------------------
// Armazenar embeddings no pgvector
// ---------------------------------------------------------------------------

export async function storeEmbeddings(
  accountId: string,
  sourceType: 'interaction' | 'support_ticket',
  sourceId: string,
  text: string
): Promise<number> {
  const supabase = getSupabaseAdminClient()
  const chunks = chunkText(text)

  // Remove embeddings anteriores para este source (re-ingestão segura)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('embeddings')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  // Gera embeddings para cada chunk (sequencial para evitar rate limit)
  const rows: {
    account_id: string
    source_type: string
    source_id: string
    chunk_index: number
    chunk_text: string
    embedding: number[]
  }[] = []

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i], TaskType.RETRIEVAL_DOCUMENT)
    rows.push({
      account_id: accountId,
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: i,
      chunk_text: chunks[i],
      embedding,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('embeddings').insert(rows)
  if (error) throw new Error(`Erro ao salvar embeddings: ${(error as any).message}`)

  return chunks.length
}

// ---------------------------------------------------------------------------
// Busca por similaridade via RPC (search_embeddings SQL function)
// ---------------------------------------------------------------------------

export async function searchEmbeddings(
  queryText: string,
  options: {
    accountId?: string
    sourceType?: 'interaction' | 'support_ticket'
    limit?: number
    threshold?: number
  } = {}
): Promise<EmbeddingSearchResult[]> {
  const supabase = getSupabaseAdminClient()
  const embedding = await generateEmbedding(queryText, TaskType.RETRIEVAL_QUERY)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('search_embeddings', {
    query_embedding: embedding,
    match_account_id: options.accountId ?? null,
    match_source_type: options.sourceType ?? null,
    match_limit: options.limit ?? env.thresholds.vectorTopK,
    match_threshold: options.threshold ?? 0.5,
  })

  if (error) throw new Error(`Erro na busca vetorial: ${(error as any).message}`)
  return (data ?? []) as EmbeddingSearchResult[]
}
