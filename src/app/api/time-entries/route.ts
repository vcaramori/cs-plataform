import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { parseTimeEntry } from '@/lib/gemini/parse-time-entry'

const BodySchema = z.object({
  raw_text: z.string().min(5),
  account_id: z.string().uuid().optional(),
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
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .ilike('name', `%${parsedEntry.account_name_hint}%`)
      .eq('csm_owner_id', user.id)
      .limit(1)

    if (accounts && accounts.length > 0) {
      accountId = accounts[0].id
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
      ...(needsReview && { status: 'pending_review' }),
    })
    .select('*, accounts(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result = data as any

  if (needsReview) {
    console.warn(`[TimeEntry] confidence_score=${parsedEntry.confidence_score} — salvo com status pending_review`)
  }

  // 4. Se for uma interação com o cliente, sincroniza com a tabela de interações
  const clientFacingTypes = ['meeting', 'onboarding', 'qbr']
  if (clientFacingTypes.includes(parsedEntry.activity_type)) {
    await supabase.from('interactions').insert({
      account_id: accountId,
      csm_id: user.id,
      title: `Esforço: ${(parsedEntry.activity_type as string) === 'meeting' ? 'Reunião' : parsedEntry.activity_type}`,
      type: parsedEntry.activity_type,
      date: parsedEntry.date,
      direct_hours: parsedEntry.parsed_hours,
      source: 'effort_sync',
      time_entry_id: result.id // CRITICAL: This was missing
    })
  }

  return NextResponse.json({
    ...result,
    confidence_score: parsedEntry.confidence_score,
    needs_review: needsReview,
  }, { status: 201 })
}
