import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  alert_threshold_pct: z.number().min(1).max(100).optional(),
  auto_close_hours: z.number().min(1).optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().optional()
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params
  const body = await request.json()

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: 'Empty payload' }, { status: 400 })

  const { data, error } = await supabase
    .from('sla_policies')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
