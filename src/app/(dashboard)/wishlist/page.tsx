import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { WishlistClient } from './components/WishlistClient'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const db = supabase

  const { data: pendingSignals } = await db
    .from('wishlist_signals')
    .select('id, account_id, source_type, verbatim, summary, kind, ai_confidence, requester_name, created_at, cluster_key, catalog_match, area, accounts(name, csm_owner_id)')
    .eq('triage_outcome', 'pending')
    .order('created_at', { ascending: false })
    .limit(400)

  const { data: items } = await db
    .from('wishlist_items')
    .select('id, title, kind, status, priority, category, areas, demand_accounts, demand_arr, rice_score, updated_at')
    .order('rice_score', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(200)

  // contas para captura manual
  const { data: accounts } = await db
    .from('accounts')
    .select('id, name')
    .order('name', { ascending: true })
    .limit(500)

  // CSMs (donos das contas) para o filtro — resolve nomes dos csm_owner_id presentes nos sinais.
  const csmIds = [...new Set(((pendingSignals ?? []) as any[]).map((s) => s.accounts?.csm_owner_id).filter(Boolean))]
  const { data: csmProfiles } = csmIds.length
    ? await db.from('profiles').select('id, full_name').in('id', csmIds)
    : { data: [] as any[] }
  const csms = (csmProfiles ?? []).map((p: any) => ({ id: p.id, name: p.full_name ?? '—' }))

  return (
    <PageContainer>
      <ModuleHeader
        title="Wishlist"
        subtitle="Coleta, curadoria e encaminhamento de pedidos de cliente ao time de produto"
        iconName="Lightbulb"
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <WishlistClient
          pendingSignals={pendingSignals ?? []}
          items={items ?? []}
          accounts={accounts ?? []}
          csms={csms}
        />
      </Suspense>
    </PageContainer>
  )
}
