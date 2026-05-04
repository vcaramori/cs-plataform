import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateText, generateEmbedding } from '@/lib/llm/gateway'
import { searchEmbeddingsWithVector } from '@/lib/supabase/vector-search'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Timeout para o chat: 45 segundos (bem menor que o RAG completo)
const CHAT_TIMEOUT_MS = 45_000

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { message, context } = body
    const accountId: string | undefined = context?.accountId
    const accountName: string | undefined = context?.accountName

    const admin = getSupabaseAdminClient() as any

    // Race: pipeline vs timeout
    const chatResult = await Promise.race([
      runChatPipeline(message, accountId, accountName, admin),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), CHAT_TIMEOUT_MS)
      ),
    ])

    return NextResponse.json({ reply: chatResult })
  } catch (err: any) {
    if (err?.message === 'TIMEOUT') {
      console.warn('[Chat API] Timeout atingido — respondendo com fallback gracioso')
      return NextResponse.json({
        reply: 'Desculpe, a busca demorou mais do que o esperado. Tente reformular sua pergunta de forma mais específica ou tente novamente em instantes.',
      })
    }
    console.error('[Chat API] Erro:', err)
    return NextResponse.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}

async function runChatPipeline(
  message: string,
  accountId: string | undefined,
  accountName: string | undefined,
  db: any
): Promise<string> {
  // 1. Busca semântica leve (apenas 5 chunks, threshold mais alto)
  const { result: queryEmbedding } = await generateEmbedding(message, { allowFallback: true })
  const chunks = await searchEmbeddingsWithVector(queryEmbedding, {
    accountId,
    limit: 5,
    threshold: 0.35,
  })

  // 2. Busca contexto estruturado básico (apenas para a conta atual)
  const [healthRes, contractRes] = accountId
    ? await Promise.all([
        db.from('health_scores')
          .select('evaluated_at, manual_score, shadow_score, classification, manual_notes, shadow_reasoning')
          .eq('account_id', accountId)
          .order('evaluated_at', { ascending: false })
          .limit(1),
        db.from('contracts')
          .select('mrr, renewal_date, status, service_type')
          .eq('account_id', accountId)
          .eq('status', 'active')
          .limit(1),
      ])
    : [{ data: [] }, { data: [] }]

  // 3. Monta contexto reduzido
  const contextParts: string[] = []

  if (accountName) {
    contextParts.push(`## Cliente: ${accountName}`)
  }

  if (healthRes.data?.length > 0) {
    const h = healthRes.data[0]
    contextParts.push(
      `## Saúde\nScore Manual: ${h.manual_score ?? '—'} | Score IA: ${h.shadow_score ?? '—'} | Classificação: ${h.classification ?? '—'}${h.shadow_reasoning ? `\nRaciocínio IA: ${h.shadow_reasoning}` : ''}`
    )
  }

  if (contractRes.data?.length > 0) {
    const c = contractRes.data[0]
    contextParts.push(
      `## Contrato\nMRR: R$ ${c.mrr?.toLocaleString('pt-BR') ?? '—'} | Plano: ${c.service_type ?? '—'} | Renovação: ${c.renewal_date ?? '—'}`
    )
  }

  if (chunks.length > 0) {
    const chunkText = chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join('\n---\n')
    contextParts.push(`## Interações e Tickets Relevantes\n${chunkText}`)
  }

  const contextBlock = contextParts.join('\n\n')

  // 4. Gera resposta com instrução simplificada
  const systemInstruction = `Você é um assistente de Customer Success da Plannera.
Responda SEMPRE em Português do Brasil. Seja conciso e direto.
Use os dados fornecidos. Se não tiver informação suficiente, diga honestamente.
Não invente dados. Não use caracteres não-latinos.`

  const userContent = contextBlock
    ? `${contextBlock}\n\n## Pergunta\n${message}`
    : message

  const { result: answer } = await generateText(userContent, {
    systemInstruction,
    allowFallback: true,
  })

  return answer
}
