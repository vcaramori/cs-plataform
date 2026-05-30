import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { WishlistItemDetail } from '../components/WishlistItemDetail'

export const dynamic = 'force-dynamic'

export default async function WishlistItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const db = supabase as any

  const { data: item } = await db.from('wishlist_items').select('*').eq('id', id).single()
  if (!item) notFound()

  const { data: signals } = await db
    .from('wishlist_signals')
    .select('id, account_id, source_type, verbatim, summary, triage_outcome, created_at, accounts(name)')
    .eq('item_id', id)
    .order('created_at', { ascending: false })

  let matchedFeature: { id: string; name: string } | null = null
  if (item.matched_feature_id) {
    const { data: f } = await db.from('product_features').select('id, name').eq('id', item.matched_feature_id).maybeSingle()
    matchedFeature = f ?? null
  }

  const { data: log } = await db
    .from('wishlist_curation_log')
    .select('id, action, from_status, to_status, note, created_at')
    .eq('item_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: handoffs } = await db
    .from('wishlist_handoffs')
    .select('id, target, status, response_status, created_at')
    .eq('item_id', id)
    .order('created_at', { ascending: false })

  return (
    <PageContainer>
      <WishlistItemDetail
        item={item}
        signals={signals ?? []}
        matchedFeature={matchedFeature}
        log={log ?? []}
        handoffs={handoffs ?? []}
      />
    </PageContainer>
  )
}
