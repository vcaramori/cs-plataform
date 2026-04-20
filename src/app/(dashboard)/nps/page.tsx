import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NPSDashboardClient } from './NPSDashboardClient'

export default async function NPSPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-500">Usuário não autenticado.</p>
      </div>
    )
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)
    .order('name')

  return <NPSDashboardClient accounts={accounts ?? []} />
}
