import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { OpportunityItemDetail } from '../components/OpportunityItemDetail'

export const dynamic = 'force-dynamic'

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: item } = await db.from('opportunity_items').select('*').eq('id', id).single()
  if (!item) notFound()

  const { data: signals } = await db
    .from('opportunity_signals')
    .select('id, verbatim, summary, source_type, opportunity_type, created_at, accounts(name)')
    .eq('item_id', id)
    .order('created_at', { ascending: false })

  const { data: log } = await db
    .from('opportunity_curation_log')
    .select('id, action, from_status, to_status, note, created_at')
    .eq('item_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: handoffs } = await db
    .from('opportunity_handoffs')
    .select('id, target, status, created_at')
    .eq('item_id', id)
    .order('created_at', { ascending: false })

  return (
    <PageContainer>
      <OpportunityItemDetail
        item={item}
        signals={signals ?? []}
        log={log ?? []}
        handoffs={handoffs ?? []}
      />
    </PageContainer>
  )
}
