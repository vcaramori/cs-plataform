import { PageContainer } from '@/components/ui/page-container'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketCheck } from 'lucide-react'
import { SuporteClient } from './components/SuporteClient'

export default async function SuportePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: tickets }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name')
      .order('name'),
    supabase
      .from('support_tickets')
      .select('*, accounts!inner(name, csm_owner_id)')
      .order('sla_status_resolution', { ascending: true, nullsFirst: false })
      .order('opened_at', { ascending: false })
      .limit(200),
  ])

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <TicketCheck className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Suporte & Chamados</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Gestão de Incidentes, Vetorização para RAG e SLA de Atendimento
        </p>
      </div>

      <SuporteClient
        accounts={accounts ?? []}
        initialTickets={(tickets ?? []) as any}
      />
    </PageContainer>
  )
}
