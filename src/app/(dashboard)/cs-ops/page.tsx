import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { CSOpsClient } from './components/CSOpsClient'

export default async function CSOpsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!profile || !profile.role || !['csm_senior', 'head_cs', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: rawCsms } = await supabase
    .from('profiles')
    .select('id, role')
    .in('role', ['csm', 'csm_senior', 'account_manager'])
    .order('role')

  const csms = (rawCsms ?? [])
    .filter(c => c.id && c.role)
    .map(c => ({ id: c.id, role: c.role as string }))

  return (
    <PageContainer>
      <ModuleHeader
        title="CS Operations"
        subtitle="Scorecard de CSMs, capacity planning e rebalanceamento de portfólio"
        iconName="Users"
      />

      <Suspense>
        <CSOpsClient csms={csms} />
      </Suspense>
    </PageContainer>
  )
}
