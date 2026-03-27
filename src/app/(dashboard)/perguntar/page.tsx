import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PerguntarClient } from './components/PerguntarClient'

export default async function PerguntarPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)
    .order('name')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Perguntar</h1>
        <p className="text-slate-400 text-sm mt-1">
          Faça perguntas em linguagem natural sobre contas ou sobre o portfólio inteiro
        </p>
      </div>
      <PerguntarClient accounts={accounts ?? []} />
    </div>
  )
}
