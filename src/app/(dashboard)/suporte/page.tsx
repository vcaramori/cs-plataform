import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { SuporteClient } from './components/SuporteClient'
import { TicketCheck } from 'lucide-react'

export default async function SuportePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: tickets }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name')
      .eq('csm_owner_id', user.id)
      .order('name'),
    supabase
      .from('support_tickets')
      .select('*, accounts!inner(name, csm_owner_id)')
      .eq('accounts.csm_owner_id', user.id)
      .order('opened_at', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <TicketCheck className="w-6 h-6 text-indigo-400" />
          Suporte
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Importe chamados via CSV ou texto livre — cada ticket é vetorizado para o RAG
        </p>
      </div>

      <SuporteClient
        accounts={accounts ?? []}
        initialTickets={(tickets ?? []) as any}
      />
    </div>
  )
}
