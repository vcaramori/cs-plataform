import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { recalculateSLAForAccount } from '@/lib/support/lifecycle'
import { z } from 'zod'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('sla_policy_levels')
    .select('*')
    .eq('policy_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

const levelItemSchema = z.object({
  level: z.enum(['critical', 'high', 'medium', 'low']),
  first_response_minutes: z.number().min(1),
  resolution_minutes: z.number().min(1)
})

const bulkPutSchema = z.array(levelItemSchema)

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params
  const body = await request.json()

  const parsed = bulkPutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // Requirement: Must provide exactly the 4 levels
  const providedLevels = parsed.data.map(l => l.level)
  const hasAll = ['critical', 'high', 'medium', 'low'].every(level => providedLevels.includes(level as any))

  if (!hasAll || providedLevels.length !== 4) {
    return NextResponse.json({ error: 'Must provide exactly the 4 standard levels' }, { status: 400 })
  }

  // Soft upsert approach by first deleting existing for policy and inserting
  // We can't do true upsert across RLS easily without unique conflits defined correctly inside the schema.
  // The schema has UNIQUE(policy_id, level) so upsert works!

  const upserts = parsed.data.map(item => ({
    policy_id: id,
    ...item
  }))

  const { data, error } = await supabase
    .from('sla_policy_levels')
    .upsert(upserts, { onConflict: 'policy_id, level' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch policy to get account_id for recalculation
  const { data: policy } = await supabase
    .from('sla_policies')
    .select('account_id')
    .eq('id', id)
    .single()

  if (policy?.account_id) {
    await recalculateSLAForAccount(policy.account_id)
  }

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params
  const body = await request.json()

  const parsed = bulkPutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const upserts = parsed.data.map(item => ({
    policy_id: id,
    ...item
  }))

  const { data, error } = await supabase
    .from('sla_policy_levels')
    .upsert(upserts, { onConflict: 'policy_id, level' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
