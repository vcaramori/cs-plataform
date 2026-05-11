import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { AlertsDashboardClient } from './components/AlertsDashboardClient'

export default async function AlertasPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <ModuleHeader
        title="Smart Alerts"
        subtitle="Central de alertas de risco, anomalias e ações críticas do portfólio"
        iconName="Bell"
      />

      <Suspense>
        <AlertsDashboardClient />
      </Suspense>
    </PageContainer>
  )
}
