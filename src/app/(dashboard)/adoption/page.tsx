import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { AdoptionDashboardClient } from './components/AdoptionDashboardClient'

export default async function AdoptionPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, health_score')
    .order('name')

  return (
    <PageContainer>
      <ModuleHeader
        title="Adoption Intelligence"
        subtitle="Heatmap de uso, blockers, forecast e análise de adoção por conta"
        iconName="BarChart2"
      />

      <Suspense>
        <AdoptionDashboardClient accounts={accounts ?? []} />
      </Suspense>
    </PageContainer>
  )
}
