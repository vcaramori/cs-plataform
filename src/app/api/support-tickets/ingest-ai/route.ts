import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { generateText } from '@/lib/llm/gateway'

const BodySchema = z.object({
  content: z.string().min(10),
  account_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { content, account_id } = parsed.data

  // -------------------------------------------------------------------------
  // Prompt Gemini — extrai tickets do texto livre (e-mail, cópia de chamado, etc.)
  // -------------------------------------------------------------------------
  const prompt = `
Você é um assistente especializado em extrair tickets de suporte a partir de textos livres.

O texto abaixo é um cópia-e-cola de um chamado de suporte. Pode conter toda a thread de e-mail,
histórico de mensagens, eventos automáticos (como mudança de status, regras automáticas, pesquisas
de satisfação), assinaturas de e-mail e outras informações irrelevantes.

Sua tarefa:
1. Identificar quantos chamados/problemas de cliente REAIS existem no texto.
   - Mensagens automáticas (pesquisa de satisfação, notificações de sistema, atribuição de agente) NÃO são tickets.
   - O histórico de respostas de um MESMO problema é 1 único ticket.
2. Para cada chamado real, extraia:
   - title: título claro e conciso do problema (máx 120 chars)
   - description: descrição detalhada do problema, baseada no texto original do cliente
   - status: EXATAMENTE um de: "open", "in-progress", "resolved", "closed"
     (use "resolved" se o chamado foi marcado como resolvido no texto)
   - priority: EXATAMENTE um de: "low", "medium", "high", "critical"
   - category: categoria em 1-2 palavras (ex: "dúvida", "bug", "financeiro", "acesso", "melhoria")
   - account_name: nome do cliente/empresa se identificado no texto (pode ser null)
   - opened_at: data de abertura no formato YYYY-MM-DD (use a data mais antiga do texto, ou null)

Retorne APENAS um JSON array. Exemplos corretos de retorno:
[
  {
    "title": "Solicitação de cálculo de ticket médio",
    "description": "Cliente solicita a adição de um indicador 'ticket médio' calculado como receita total dividida pelo volume total.",
    "status": "resolved",
    "priority": "low",
    "category": "melhoria",
    "account_name": null,
    "opened_at": "2026-04-02"
  }
]

Texto do chamado:
"""
${content.substring(0, 20000)}
"""
`

  let tickets: Array<{
    title: string
    description: string
    status: string
    priority: string
    category: string
    account_name?: string | null
    opened_at?: string | null
  }>

  try {
    const { result: rawJson, provider } = await generateText(prompt, { allowFallback: true })
    console.log(`[IngestAI] Resposta da IA via ${provider}:`, rawJson)
    const jsonStr = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
    tickets = JSON.parse(jsonStr)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Falha ao processar com IA: ${message}` },
      { status: 500 }
    )
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    return NextResponse.json(
      { error: 'A IA não identificou nenhum chamado real no texto enviado.' },
      { status: 422 }
    )
  }

  // -------------------------------------------------------------------------
  // Pré-carrega todas as contas do CSM para resolver nomes localmente (sem N+1)
  // -------------------------------------------------------------------------
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)

  // Helper para normalizar texto (remove acentos + lowercase)
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const accountMap = new Map<string, string>()
  for (const a of allAccounts ?? []) {
    accountMap.set(normalize(a.name), a.id)
  }

  // -------------------------------------------------------------------------
  // Salvar tickets no banco
  // -------------------------------------------------------------------------
  let created = 0
  const errors: string[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const t of tickets) {
    let finalAccountId = account_id ?? null

    // Resolve conta localmente via Map normalizado (sem acentos, sem N+1)
    if (!finalAccountId && t.account_name) {
      const key = normalize(t.account_name)
      for (const [name, id] of Array.from(accountMap.entries())) {
        if (name.includes(key) || key.includes(name)) {
          finalAccountId = id
          break
        }
      }
    }

    // Sem conta = descarta
    if (!finalAccountId) {
      errors.push(`Chamado "${t.title}" descartado — conta não identificada. Selecione uma conta padrão na tela.`)
      continue
    }

    // Valida e normaliza data
    const openedAt = t.opened_at && /^\d{4}-\d{2}-\d{2}$/.test(t.opened_at)
      ? t.opened_at
      : today

    // Normaliza status
    const statusMap: Record<string, string> = {
      open: 'open', aberto: 'open',
      'in-progress': 'in-progress', 'em andamento': 'in-progress',
      resolved: 'resolved', resolvido: 'resolved', solved: 'resolved',
      closed: 'closed', fechado: 'closed',
    }

    // Normaliza priority
    const priorityMap: Record<string, string> = {
      low: 'low', baixa: 'low', baixo: 'low',
      medium: 'medium', media: 'medium', normal: 'medium',
      high: 'high', alta: 'high', alto: 'high',
      critical: 'critical', critico: 'critical', urgente: 'critical',
    }

    // Insert + retorno do ID diretamente (elimina re-query por título)
    const { data: newTicket, error: insertErr } = await supabase
      .from('support_tickets')
      .insert({
        account_id: finalAccountId,
        title: t.title.slice(0, 255),
        description: t.description || t.title,
        status: statusMap[t.status?.toLowerCase() ?? ''] ?? 'open',
        priority: priorityMap[t.priority?.toLowerCase() ?? ''] ?? 'medium',
        category: t.category ?? null,
        opened_at: openedAt,
        source: 'manual',
      })
      .select('id')
      .single()

    if (insertErr || !newTicket) {
      errors.push(`Erro ao criar "${t.title}": ${insertErr?.message ?? 'erro desconhecido'}`)
    } else {
      created++
      // Vectoriza o ticket para o RAG
      try {
        const textToEmbed = `${t.title}\n\n${t.description}`
        await storeEmbeddings(finalAccountId, 'support_ticket', newTicket.id, textToEmbed)
      } catch (err) {
        console.error('Erro na vetorização pós-IA:', err)
      }
    }
  }

  return NextResponse.json({ created, errors }, { status: created > 0 ? 201 : 422 })
}
