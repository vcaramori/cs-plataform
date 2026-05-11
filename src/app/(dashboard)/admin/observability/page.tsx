import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { ObservabilityClient } from './components/ObservabilityClient'

export default async function ObservabilityPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/admin')

  return (
    <PageContainer>
      <ModuleHeader
        title="Observability"
        subtitle="Logs de aplicação, métricas de performance e rastreamento de erros"
        iconName="Activity"
      />

      <Suspense>
        <ObservabilityClient />
      </Suspense>
    </PageContainer>
  )
}
