import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout/PageContainer'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { RiskCockpitClient } from './RiskCockpitClient'

export const dynamic = 'force-dynamic'

export default async function RiscoPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <ModuleHeader
        title="Cockpit de Risco"
        subtitle="Receita em risco, severidade, drivers e tratamento — priorize a retenção do portfólio"
        iconName="AlertTriangle"
      />
      <RiskCockpitClient />
    </PageContainer>
  )
}
