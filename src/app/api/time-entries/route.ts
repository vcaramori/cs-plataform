import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseTimeEntry } from '@/lib/gemini/parse-time-entry'
import { runAutomatedAccountAnalysis } from '@/lib/ai/automated-account-analysis'
import { getHealthClassification } from '@/lib/health/utils'

const BodySchema = z.object({
  raw_text: z.string().min(5),
  account_id: z.string().uuid().optional(),
  file_urls: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  let query = supabase
    .from('time_entries')
    .select('*, accounts(name)')
    .eq('csm_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(50)

  if (accountId) query = query.eq('account_id', accountId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  let parsedEntry

  try {
    parsedEntry = await parseTimeEntry(parsed.data.raw_text, today)
  } catch (err) {
    console.error('Error parsing time entry with Gemini:', err)
    return NextResponse.json({ error: 'Falha ao processar entrada com IA' }, { status: 422 })
  }

  // Se account_id não foi passado diretamente, tenta resolver pelo nome detectado
  let accountId = parsed.data.account_id ?? null

  if (!accountId && parsedEntry.account_name_hint) {
    const hint = parsedEntry.account_name_hint
    const { data: allAccounts } = await supabase
      .from('accounts')
      .select('id, name, company_name, csm_owner_id')

    if (allAccounts && allAccounts.length > 0) {
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()

      const normalizedHint = normalize(hint)

      const candidates = allAccounts
        .map((acc) => {
          const normName = normalize(acc.name)
          const normCompany = acc.company_name ? normalize(acc.company_name) : ''

          let matched = false
          let score = 0

          if (normName === normalizedHint || normCompany === normalizedHint) {
            matched = true
            score = 100
          } else if (normalizedHint.includes(normName) || (normCompany && normalizedHint.includes(normCompany))) {
            matched = true
            score = 80
          } else if (normName.includes(normalizedHint) || (normCompany && normCompany.includes(normalizedHint))) {
            matched = true
            score = 60
          }

          if (matched && acc.csm_owner_id === user.id) {
            score += 10
          }

          return { account: acc, matched, score }
        })
        .filter((c) => c.matched)

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score)
        accountId = candidates[0].account.id
      }
    }
  }

  if (!accountId) {
    return NextResponse.json(
      {
        error: 'Conta não identificada',
        hint: 'Selecione a conta manualmente ou mencione o nome exato no texto',
        parsed: parsedEntry,
      },
      { status: 422 }
    )
  }

  const needsReview = parsedEntry.confidence_score < 0.8
  const fileUrls = parsed.data.file_urls ?? []

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      account_id: accountId,
      csm_id: user.id,
      activity_type: parsedEntry.activity_type,
      natural_language_input: parsed.data.raw_text,
      parsed_hours: parsedEntry.parsed_hours,
      parsed_description: parsedEntry.parsed_description,
      date: parsedEntry.date,
      file_urls: fileUrls,
      ...(needsReview && { status: 'pending_review' }),
    })
    .select('*, accounts(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result = data as any

  if (needsReview) {
    console.warn(`[TimeEntry] confidence_score=${parsedEntry.confidence_score} — salvo com status pending_review`)
  }

  // 4. Se for uma interação com o cliente ou texto de alto risco, sincroniza com a tabela de interações
  const clientFacingTypes = ['meeting', 'onboarding', 'qbr']
  const riskKeywords = ['crise', 'risco', 'cancelamento', 'cancelar', 'insatisfeito', 'reclamou', 'urgente', 'board']
  const positiveKeywords = ['resolvido', 'corrigido', 'sucesso', 'parabéns', 'obrigado', 'agradeço', 'positivo', 'ótimo', 'excelente']
  
  const isHighRisk = riskKeywords.some(kw => parsed.data.raw_text.toLowerCase().includes(kw))
  const isPositive = positiveKeywords.some(kw => parsed.data.raw_text.toLowerCase().includes(kw))
  
  if (clientFacingTypes.includes(parsedEntry.activity_type) || isHighRisk || isPositive) {
    // Sentiment: -0.8 (risco), 0.8 (positivo), ou 0.2 (neutro/padrão)
    const sentimentScore = isHighRisk ? -0.8 : isPositive ? 0.8 : 0.2
    const alertTriggered = isHighRisk

    const { error: intError } = await supabase.from('interactions').insert({
      account_id: accountId,
      csm_id: user.id,
      title: isHighRisk 
        ? `ALERTA: ${(parsedEntry.parsed_description || 'Crise detectada').slice(0, 50)}...`
        : isPositive
        ? `SUCESSO: ${(parsedEntry.parsed_description || 'Problema resolvido').slice(0, 50)}...`
        : `Esforço: ${(parsedEntry.activity_type as string) === 'meeting' ? 'Reunião' : parsedEntry.activity_type}`,
      type: isHighRisk ? 'churn-risk' : isPositive ? 'success' : (parsedEntry.activity_type === 'other' ? 'meeting' : parsedEntry.activity_type),
      date: parsedEntry.date,
      direct_hours: parsedEntry.parsed_hours,
      source: 'effort_sync',
      time_entry_id: result.id,
      raw_transcript: parsed.data.raw_text,
      sentiment_score: sentimentScore,
      alert_triggered: alertTriggered,
      file_urls: fileUrls
    })

    if (intError) {
      console.error('[TimeEntry] Interaction Insert Error:', intError)
    } else {
      // Trigger AI Analysis and WAIT for them to ensure they complete in this request cycle
      console.log(`[TimeEntry] Triggering AI analysis for account ${accountId}`)
      
      try {
        // Aciona análise unificada (Risco + Saúde) usando o Admin Client interno do módulo
        await runAutomatedAccountAnalysis(accountId, user.id)
      } catch (aiErr) {
        console.error('[TimeEntry] AI Analysis Error:', aiErr)
      }
    }
  }

  // Cria tarefas sugeridas a partir dos action_items extraídos pela IA
  if (parsedEntry.action_items && parsedEntry.action_items.length > 0) {
    const taskInserts = parsedEntry.action_items.map((item) => ({
      csm_id: user.id,
      account_id: accountId,
      title: item.title,
      status: 'todo',
      priority: 'medium',
      due_date: item.due_date ?? null,
      time_entry_id: result.id,
      source_label: 'time_entry',
    }))

    const adminClient = getSupabaseAdminClient() as any
    const { error: taskError } = await adminClient.from('csm_tasks').insert(taskInserts)
    if (taskError) {
      console.error('[TimeEntry] Error creating suggested tasks:', taskError)
    } else {
      console.log(`[TimeEntry] ${taskInserts.length} tarefas sugeridas criadas`)
    }
  }

  return NextResponse.json({
    ...result,
    confidence_score: parsedEntry.confidence_score,
    needs_review: needsReview,
    suggested_tasks: parsedEntry.action_items?.length ?? 0,
  }, { status: 201 })
}
