import { getProModel } from '@/lib/gemini/client'
import { searchEmbeddings } from '@/lib/supabase/vector-search'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type RAGSource = {
  type: 'interaction' | 'support_ticket'
  source_id: string
  account_name: string
  title: string
  date: string
  excerpt: string
  similarity: number
}

export type RAGResult = {
  answer: string
  sources: RAGSource[]
}

export async function runRAGPipeline(
  question: string,
  csmId: string,
  accountId?: string
): Promise<RAGResult> {
  const supabase = getSupabaseAdminClient()

  // 1. Busca vetorial nos embeddings
  const chunks = await searchEmbeddings(question, {
    accountId,
    limit: 8,
    threshold: 0.4,
  })

  // Fallback: se não achou chunks suficientes e havia filtro por conta, tenta sem threshold
  const finalChunks = chunks.length < 2
    ? await searchEmbeddings(question, { accountId, limit: 8, threshold: 0.2 })
    : chunks

  // 2. Enriquece chunks com metadados das fontes originais
  const interactionIds = finalChunks
    .filter((c) => c.source_type === 'interaction')
    .map((c) => c.source_id)
  const ticketIds = finalChunks
    .filter((c) => c.source_type === 'support_ticket')
    .map((c) => c.source_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: interactions }, { data: tickets }] = await Promise.all([
    interactionIds.length > 0
      ? db
          .from('interactions')
          .select('id, title, date, type, accounts(name)')
          .in('id', interactionIds)
      : Promise.resolve({ data: [] as any[] }),
    ticketIds.length > 0
      ? db
          .from('support_tickets')
          .select('id, title, opened_at, priority, accounts(name)')
          .in('id', ticketIds)
      : Promise.resolve({ data: [] as any[] }),
  ]) as [{ data: any[] }, { data: any[] }]

  const interactionMap = new Map((interactions ?? []).map((i) => [i.id, i]))
  const ticketMap = new Map((tickets ?? []).map((t) => [t.id, t]))

  // 3. Monta contexto para o Gemini
  const contextBlocks = finalChunks.map((chunk, idx) => {
    if (chunk.source_type === 'interaction') {
      const meta = interactionMap.get(chunk.source_id)
      const account = (meta?.accounts as any)?.name ?? 'Conta desconhecida'
      const date = meta?.date ?? ''
      const type = meta?.type ?? 'meeting'
      return `[${idx + 1}] REUNIÃO | ${account} | ${date} | Tipo: ${type}\n${chunk.chunk_text}`
    } else {
      const meta = ticketMap.get(chunk.source_id)
      const account = (meta?.accounts as any)?.name ?? 'Conta desconhecida'
      const date = meta?.opened_at ?? ''
      const priority = meta?.priority ?? 'medium'
      return `[${idx + 1}] TICKET | ${account} | ${date} | Prioridade: ${priority}\n${chunk.chunk_text}`
    }
  }).join('\n\n---\n\n')

  // 4. Gera resposta com Gemini Pro
  const scopeDescription = accountId
    ? 'sobre uma conta específica'
    : 'sobre o portfólio completo de CS'

  const prompt = `Você é um assistente especializado em Customer Success. Responda à pergunta abaixo usando APENAS as informações fornecidas no contexto. Não invente dados.

Se a informação não estiver no contexto, diga explicitamente que não encontrou dados suficientes.
Responda em português, de forma direta e objetiva.
Ao citar informações, referencie a fonte usando [N] onde N é o número do bloco.

## Contexto disponível (${scopeDescription})
${contextBlocks || 'Nenhum dado encontrado para essa consulta.'}

## Pergunta
${question}`

  const model = getProModel()
  const result = await model.generateContent(prompt)
  const answer = result.response.text().trim()

  // 5. Monta lista de fontes
  const sources: RAGSource[] = finalChunks.map((chunk) => {
    if (chunk.source_type === 'interaction') {
      const meta = interactionMap.get(chunk.source_id)
      return {
        type: 'interaction' as const,
        source_id: chunk.source_id,
        account_name: (meta?.accounts as any)?.name ?? 'Conta desconhecida',
        title: meta?.title ?? 'Reunião',
        date: meta?.date ?? '',
        excerpt: chunk.chunk_text.slice(0, 150),
        similarity: chunk.similarity,
      }
    } else {
      const meta = ticketMap.get(chunk.source_id)
      return {
        type: 'support_ticket' as const,
        source_id: chunk.source_id,
        account_name: (meta?.accounts as any)?.name ?? 'Conta desconhecida',
        title: meta?.title ?? 'Ticket',
        date: meta?.opened_at ?? '',
        excerpt: chunk.chunk_text.slice(0, 150),
        similarity: chunk.similarity,
      }
    }
  })

  return { answer, sources }
}
