import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { parseHistoricalEfforts, type HistoricalEntry } from '@/lib/gemini/parse-historical-efforts'
import { validateHistoricalEntries } from '@/lib/effort/validate-historical'
import { persistHistoricalEffort } from '@/lib/effort/log-effort'

export const maxDuration = 300

const EntrySchema = z.object({
  date: z.string(),
  raw_text: z.string(),
  parsed_description: z.string(),
  activity_type: z.string(),
  parsed_hours: z.number(),
  account_name_hint: z.string().nullable().optional(),
  action_items: z.array(z.object({ title: z.string(), due_date: z.string().nullable() })).default([]),
  skip_tasks: z.boolean(),
})

const CommitSchema = z.object({
  mode: z.literal('commit'),
  account_id: z.string().uuid(),
  create_tasks: z.boolean().default(true),
  entries: z.array(EntrySchema).min(1),
})

// Carga histórica de esforços: mode 'preview' (IA separa o bloco em N reuniões por
// data, sem gravar) e mode 'commit' (persiste cada entrada na sua data real).
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  if (body?.mode === 'preview') {
    if (typeof body.text !== 'string' || body.text.trim().length < 10) {
      return NextResponse.json({ error: 'Texto muito curto.' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    try {
      const { entries, truncated } = await parseHistoricalEfforts(body.text, today)
      const warnings = validateHistoricalEntries(entries, { today, truncated })
      return NextResponse.json({ entries, warnings })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Falha ao analisar o texto.' }, { status: 500 })
    }
  }

  const parsed = CommitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Acesso à conta via RLS
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada ou sem acesso.' }, { status: 404 })

  let saved = 0
  let tasksCreated = 0
  const errors: string[] = []
  for (const entry of parsed.data.entries) {
    // Defesa: nunca grava data inválida (a UI já desmarca, mas chamadas diretas não)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(entry.date))) {
      errors.push(`${entry.date}: data inválida (ignorada)`)
      continue
    }
    try {
      const r = await persistHistoricalEffort({
        userId: user.id,
        accountId: parsed.data.account_id,
        entry: entry as HistoricalEntry,
        createTasks: parsed.data.create_tasks,
      })
      saved++
      tasksCreated += r.tasksCreated
    } catch (e: any) {
      errors.push(`${entry.date}: ${e?.message ?? 'erro ao salvar'}`)
    }
  }

  return NextResponse.json({ ok: true, saved, tasksCreated, errors })
}
