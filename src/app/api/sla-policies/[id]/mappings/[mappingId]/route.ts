import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string, mappingId: string } }
) {
  const supabase = await getSupabaseServerClient()
  const { id, mappingId } = params

  const { error } = await supabase
    .from('sla_level_mappings')
    .delete()
    // Enforce policy_id matches the param for security
    .match({ id: mappingId, policy_id: id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
