import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { OpportunitiesClient } from './components/OpportunitiesClient'

export const dynamic = 'force-dynamic'

export default async function OportunidadesPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // Tabelas novas (fora dos tipos gerados) — client destipado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: pendingSignals } = await db
    .from('opportunity_signals')
    .select('id, account_id, source_type, verbatim, summary, opportunity_type, ai_confidence, requester_name, created_at, accounts(name)')
    .eq('triage_outcome', 'pending')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: items } = await db
    .from('opportunity_items')
    .select('id, title, opportunity_type, status, priority, category, demand_accounts, demand_arr, estimated_value, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200)

  const { data: accounts } = await db
    .from('accounts')
    .select('id, name')
    .order('name', { ascending: true })
    .limit(500)

  return (
    <PageContainer>
      <ModuleHeader
        title="Oportunidades"
        subtitle="Captura, curadoria e agrupamento de sinais comerciais (upsell, novos módulos S&OP, gaps) para o Pipedrive"
        iconName="TrendingUp"
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <OpportunitiesClient
          pendingSignals={pendingSignals ?? []}
          items={items ?? []}
          accounts={accounts ?? []}
        />
      </Suspense>
    </PageContainer>
  )
}
