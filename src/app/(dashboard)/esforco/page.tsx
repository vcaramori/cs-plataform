import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { EsforcoClient } from './components/EsforcoClient'

export default async function EsforcoPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: entries }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name')
      .order('name'),
    supabase
      .from('time_entries')
      .select('*, accounts(name)')
      .eq('csm_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Esforço Back-office</h1>
        <p className="text-slate-400 text-sm mt-1">
          Registre tempo indireto em linguagem natural — a IA extrai conta, tipo e duração automaticamente
        </p>
      </div>

      <EsforcoClient
        accounts={accounts ?? []}
        initialEntries={(entries ?? []) as any}
      />
    </div>
  )
}
