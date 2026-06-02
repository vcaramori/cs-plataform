import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
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

  const scope = await getUserAccessScope(user.id, 'nps')

  let accountsQuery = supabase.from('accounts').select('id, name').order('name')
  if (scope !== 'global') {
    accountsQuery = accountsQuery.eq('csm_owner_id', user.id)
  }
  const { data: accounts } = await accountsQuery

  return (
    <Suspense>
      <NPSDashboardClient accounts={accounts ?? []} />
    </Suspense>
  )
}
