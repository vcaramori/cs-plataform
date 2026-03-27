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
  } catch {
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
    })
    .select('*, accounts(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
