import { PageContainer } from '@/components/ui/page-container'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketCheck } from 'lucide-react'
import { SuporteClient } from './components/SuporteClient'
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"

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
      <ModuleHeader 
        title="Suporte & Chamados" 
        subtitle="Gestão de Incidentes, Vetorização para RAG e SLA de Atendimento"
        iconName="TicketCheck"
      />

      <SuporteClient
        accounts={accounts ?? []}
        initialTickets={(tickets ?? []) as any}
      />
    </PageContainer>
  )
}
