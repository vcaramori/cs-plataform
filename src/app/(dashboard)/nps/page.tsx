import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NPSDashboardClient } from './NPSDashboardClient'

export default async function NPSPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-content-secondary font-medium">Usuário não autenticado.</p>
      </div>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = ['admin', 'super_admin', 'head_cs'].includes(profile?.role)

  let accountsQuery = supabase.from('accounts').select('id, name').order('name')
  if (!isAdmin) {
    accountsQuery = accountsQuery.eq('csm_owner_id', user.id)
  }
  const { data: accounts } = await accountsQuery

  return (
    <Suspense>
      <NPSDashboardClient accounts={accounts ?? []} />
    </Suspense>
  )
}
