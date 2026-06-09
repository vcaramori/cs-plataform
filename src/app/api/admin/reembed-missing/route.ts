import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { reembedMissing, type ReembedSourceType } from '@/lib/rag/reembed'

export const maxDuration = 300

// POST /api/admin/reembed-missing — reprocessa embeddings faltantes (admin).
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single()
  const isAdmin = (profile as any)?.is_super_admin || ['admin', 'super_admin'].includes((profile as any)?.role ?? '')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any = {}
  try { body = await request.json() } catch { /* sem corpo */ }
  const sourceTypes = Array.isArray(body?.sourceTypes) ? (body.sourceTypes as ReembedSourceType[]) : undefined
  const limitPerType = typeof body?.limitPerType === 'number' ? body.limitPerType : undefined

  const stats = await reembedMissing({ sourceTypes, limitPerType })
  return NextResponse.json({ ok: true, stats })
}
