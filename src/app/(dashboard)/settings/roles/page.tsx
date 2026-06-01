import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { RolesClient } from './components/RolesClient'

export default async function RolesPage() {
  const { profile } = await requirePageAuth('manage:roles')

  const admin = getSupabaseAdminClient()
  const { data: roles } = await admin
    .from('custom_roles')
    .select('*')
    .order('name', { ascending: true })

  return (
    <PageContainer className="max-w-[1600px] space-y-0">
      <ModuleHeader
        title="Perfis de Acesso"
        subtitle="Governanca de Permissoes por Modulo"
        iconName="ShieldCheck"
      />
      <RolesClient
        initialRoles={(roles || []) as any}
        currentUserRole={profile.role}
      />
    </PageContainer>
  )
}
