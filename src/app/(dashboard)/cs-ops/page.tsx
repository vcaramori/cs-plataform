import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { CSOpsClient } from './components/CSOpsClient'

export default async function CSOpsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Acesso de gestor (view_team dinâmico; super_admin sempre)
  if (!(await getModulePermission(user.id, 'esforco', 'view_team'))) {
    redirect('/dashboard')
  }

  const { data: rawCsms } = await supabase
    .from('profiles')
    .select('id, role')
    .in('role', ['csm', 'csm_senior', 'head_cs', 'account_manager', 'admin', 'super_admin'])
    .order('role')

  const csms = (rawCsms ?? [])
    .filter(c => c.id && c.role)
    .map(c => ({ id: c.id, role: c.role as string }))

  return (
    <PageContainer>
      <ModuleHeader
        title="Capacidade & Produtividade"
        subtitle="Produtividade da equipe de CS, capacity planning e rebalanceamento de portfólio"
        iconName="Users"
      />

      <Suspense>
        <CSOpsClient csms={csms} />
      </Suspense>
    </PageContainer>
  )
}
