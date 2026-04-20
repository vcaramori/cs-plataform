import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProgramsClient } from './ProgramsClient'

export default async function ProgramsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)
    .order('name')

  return <ProgramsClient accounts={accounts ?? []} />
}
