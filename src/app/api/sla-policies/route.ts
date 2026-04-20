import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { z } from 'zod'

const getQuerySchema = z.object({
  contract_id: z.string().uuid()
})

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  
  const parsed = getQuerySchema.safeParse({ contract_id: searchParams.get('contract_id') })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid contract_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('contract_id', parsed.data.contract_id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json(null)

  return NextResponse.json(data)
}

const postSchema = z.object({
  contract_id: z.string().uuid(),
  account_id: z.string().uuid(),
  alert_threshold_pct: z.number().min(1).max(100).default(25),
  auto_close_hours: z.number().min(1).default(48),
  timezone: z.string().default('America/Sao_Paulo')
})

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { data, error } = await supabase
    .from('sla_policies')
    .insert([parsed.data])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Policy already exists for this contract' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
