import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { z } from 'zod'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  
  let query = supabase.from('business_hours').select('*').order('dow', { ascending: true })
  
  if (accountId) {
    query = query.eq('account_id', accountId)
  } else {
    query = query.eq('scope', 'global')
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(['global', 'account']),
  account_id: z.string().uuid().nullable(),
  dow: z.number().min(0).max(6),
  start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM'),
  end_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM'),
  is_active: z.boolean()
})

const bulkPostSchema = z.array(itemSchema)

export async function PUT(request: Request) {
  const supabase = createClient()
  const body = await request.json()

  const parsed = bulkPostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // Simplified: Delete existing for the given scope/account and insert all new
  const first = parsed.data[0]
  if (!first) return NextResponse.json([])

  const scope = first.scope
  const accountId = first.account_id

  // Security check: ensure all items share the same scope context
  const valid = parsed.data.every(d => d.scope === scope && d.account_id === accountId)
  if (!valid) return NextResponse.json({ error: 'Mixed scopes in payload' }, { status: 400 })

  // Delete old
  let delQuery = supabase.from('business_hours').delete().eq('scope', scope)
  if (accountId) {
    delQuery = delQuery.eq('account_id', accountId)
  } else {
    delQuery = delQuery.is('account_id', null)
  }
  await delQuery

  // Insert new
  const inserts = parsed.data.map(d => ({
    scope: d.scope,
    account_id: d.account_id,
    dow: d.dow,
    start_time: d.start_time,
    end_time: d.end_time,
    is_active: d.is_active
  }))

  const { data, error } = await supabase.from('business_hours').insert(inserts).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
