import { redirect } from 'next/navigation'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { UsersClient } from './components/UsersClient'
import { hasPermission } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/supabase/types'

export default async function UsersPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, 'view:users')) {
    redirect('/dashboard')
  }

  const admin = getSupabaseAdminClient()

  // Fetch all auth users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers()

  // Fetch all profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('*')

  // Fetch custom roles
  const { data: roles } = await admin
    .from('custom_roles')
    .select('*')
    .order('name', { ascending: true })

  // Mapa custom_role_id → nome (o "perfil" exibido é o nome do custom role)
  const roleNameById = new Map<string, string>((roles ?? []).map((r: any) => [r.id, r.name]))

  // Merge auth users with profiles
  const users = (authUsers || []).map(u => {
    const p = profiles?.find(pr => pr.id === u.id)
    const customRoleId = (p as any)?.custom_role_id ?? null
    const effectiveRole = customRoleId && roleNameById.has(customRoleId)
      ? roleNameById.get(customRoleId)!
      : (p?.role || 'csm')
    return {
      id: u.id,
      email: u.email || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      full_name: p?.full_name || 'N/A',
      role: effectiveRole,
      is_active: p?.is_active !== false,
      user_type: (p as any)?.user_type || 'internal',
      avatar_url: (p as any)?.avatar_url || null,
      is_super_admin: !!(p as any)?.is_super_admin || p?.role === 'super_admin',
    }
  })

  return (
    <PageContainer className="max-w-[1400px] space-y-0">
      <ModuleHeader
        title="Gestao de Usuarios"
        subtitle="Controle de Acessos, Perfis e Governanca"
        iconName="Users"
      />
      <UsersClient
        initialUsers={users}
        roles={(roles || []) as any}
        currentUserRole={profile.role}
        currentUserId={user.id}
        currentUserIsSuperAdmin={!!(profile as any).is_super_admin || profile.role === 'super_admin'}
      />
    </PageContainer>
  )
}
