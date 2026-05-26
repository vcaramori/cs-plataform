import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getLLMSettings } from '@/lib/llm/settings'

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

    // Trigger backfill by calling the existing endpoint internally
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/support-tickets/backfill-embeddings`, {
      method: 'POST',
      headers: { 'x-api-secret': process.env.API_SECRET || '' },
    }).catch(err => console.error('[Reindex] Backfill trigger failed:', err))

    return NextResponse.json({
      ok: true,
      message: `Embeddings cleared. Re-indexing started with ${settings.embeddingProvider} (${newDimensions}d).`,
      dimensions: newDimensions,
      provider: settings.embeddingProvider,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
