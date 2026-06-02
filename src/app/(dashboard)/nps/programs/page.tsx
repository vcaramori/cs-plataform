import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { redirect } from 'next/navigation'
import { ProgramsClient } from './ProgramsClient'

export default async function ProgramsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const scope = await getUserAccessScope(user.id, 'nps')
  let accountsQuery = supabase.from('accounts').select('id, name').order('name')
  if (scope !== 'global') accountsQuery = accountsQuery.eq('csm_owner_id', user.id)
  const { data: accounts } = await accountsQuery

  return <ProgramsClient accounts={accounts ?? []} />
}
