import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getLLMSettings } from '@/lib/llm/settings'
import { reembedMissing } from '@/lib/rag/reembed'

export const maxDuration = 300

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()
  const db = admin as any
  const settings = await getLLMSettings()

  try {
    // Clear existing embeddings
    const { error: truncateError } = await db
      .from('embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (truncateError) {
      return NextResponse.json({ error: `Failed to clear embeddings: ${truncateError.message}` }, { status: 500 })
    }

    // Update vector dimension if needed via raw SQL
    const newDimensions = settings.embeddingDimensions
    const { error: alterError } = await db.rpc('alter_embedding_dimension', {
      new_dimension: newDimensions,
    })

    if (alterError) {
      console.error('[Reindex] Could not alter dimension via RPC (may need manual migration):', alterError.message)
    }

    // Re-indexa TODAS as fontes (não só tickets): interações, tickets, NPS,
    // onboarding e negociação. Fire-and-forget; o cron/botão "Reprocessar" cobre o resto.
    void reembedMissing({ limitPerType: 1000 }).catch(err => console.error('[Reindex] reembed falhou:', err))

    return NextResponse.json({
      ok: true,
      message: `Embeddings limpos. Re-indexação iniciada (todas as fontes) com ${settings.embeddingProvider} (${newDimensions}d).`,
      dimensions: newDimensions,
      provider: settings.embeddingProvider,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
