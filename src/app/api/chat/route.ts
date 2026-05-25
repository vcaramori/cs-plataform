import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateText, generateEmbedding } from '@/lib/llm/gateway'
import { searchEmbeddingsWithVector } from '@/lib/supabase/vector-search'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { loadInstruction } from '@/lib/ai/load-instruction'

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

  // 2. Busca contexto estruturado
  const contextParts: string[] = []

  if (accountId) {
    // Modo conta específica - Busca saúde, contrato, interações, esforços e chamados de suporte
    const [healthRes, contractRes, interactionsRes, effortsRes, ticketsRes] = await Promise.all([
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
      db.from('interactions')
        .select('title, raw_transcript, date, type')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .limit(10),
      db.from('time_entries')
        .select('activity_type, parsed_description, natural_language_input, date, parsed_hours')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .limit(10),
      db.from('support_tickets')
        .select('title, status, opened_at, description')
        .eq('account_id', accountId)
        .order('opened_at', { ascending: false })
        .limit(10),
    ])

    if (accountName) contextParts.push(`## Cliente: ${accountName}`)

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

    if (interactionsRes.data && interactionsRes.data.length > 0) {
      const ints = interactionsRes.data.map((i: any) => 
        `- [${i.date}] ${i.title}${i.raw_transcript ? ` (Detalhe/Transcrição: ${i.raw_transcript})` : ''}`
      ).join('\n')
      contextParts.push(`## Reuniões e Interações Recentes\n${ints}`)
    }

    if (effortsRes.data && effortsRes.data.length > 0) {
      const effs = effortsRes.data.map((e: any) => 
        `- [${e.date}] Esforço de ${e.activity_type} (${e.parsed_hours ?? 0}h): ${e.parsed_description || e.natural_language_input || 'Sem detalhes'}`
      ).join('\n')
      contextParts.push(`## Registros de Esforço Recentes\n${effs}`)
    }

    if (ticketsRes.data && ticketsRes.data.length > 0) {
      const tks = ticketsRes.data.map((t: any) => 
        `- [${t.opened_at}] Chamado: ${t.title} | Status: ${t.status}${t.description ? ` (Descrição: ${t.description})` : ''}`
      ).join('\n')
      contextParts.push(`## Chamados de Suporte Recentes\n${tks}`)
    }
  } else {
    // Modo portfólio completo — busca resumo agregado
    const { data: portfolioHealth } = await db
      .from('health_scores')
      .select('account_id, manual_score, shadow_score, classification, accounts(name)')
      .order('evaluated_at', { ascending: false })

    if (portfolioHealth && portfolioHealth.length > 0) {
      // Deduplica pegando o mais recente por conta
      const seen = new Set<string>()
      const latest: any[] = []
      for (const row of portfolioHealth) {
        if (!seen.has(row.account_id)) {
          seen.add(row.account_id)
          latest.push(row)
        }
      }

      const critical = latest.filter((r: any) => (r.manual_score ?? r.shadow_score ?? 100) < 40)
      const atRisk   = latest.filter((r: any) => { const s = r.manual_score ?? r.shadow_score ?? 100; return s >= 40 && s < 60 })
      const healthy  = latest.filter((r: any) => (r.manual_score ?? r.shadow_score ?? 0) >= 60)

      const toLine = (r: any) => {
        const name = r.accounts?.name ?? r.account_id
        const score = r.manual_score ?? r.shadow_score ?? '—'
        return `  - ${name} (score: ${score}, classificação: ${r.classification ?? '—'})`
      }

      const lines: string[] = [`## Resumo Global do Portfólio (${latest.length} contas)`]
      if (critical.length > 0) lines.push(`### Crítico (score < 40) — ${critical.length} conta(s)\n${critical.map(toLine).join('\n')}`)
      if (atRisk.length  > 0) lines.push(`### Em Risco (score 40–59) — ${atRisk.length} conta(s)\n${atRisk.map(toLine).join('\n')}`)
      if (healthy.length > 0) lines.push(`### Saudáveis (score ≥ 60) — ${healthy.length} conta(s)\n${healthy.map(toLine).join('\n')}`)
      contextParts.push(lines.join('\n'))
    }
  }

  if (chunks.length > 0) {
    const chunkText = chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join('\n---\n')
    contextParts.push(`## Interações e Tickets Relevantes\n${chunkText}`)
  }

  const contextBlock = contextParts.join('\n\n')

  // 4. Gera resposta — instrução carregada do banco (admin pode editar via /admin/settings)
  const systemInstruction = await loadInstruction(
    'instruction_chat',
    `Você é um assistente de Customer Success da Plannera.
Responda SEMPRE em Português do Brasil. Seja conciso e direto.
Use os dados fornecidos. Se não tiver informação suficiente, diga honestamente.
Não invente dados. Não use caracteres não-latinos.`
  )

  const userContent = contextBlock
    ? `${contextBlock}\n\n## Pergunta\n${message}`
    : message

  const { result: answer } = await generateText(userContent, {
    systemInstruction,
    allowFallback: true,
  })

  return answer
}
