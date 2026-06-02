import { requirePortalAuth } from '@/lib/auth/require-portal-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PortalHeader } from '../../_components/PortalHeader'
import { PortalTicketDetailClient } from './PortalTicketDetailClient'

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { account, accounts } = await requirePortalAuth()
  const db = getSupabaseAdminClient() as any

  const { data: ticket } = await db
    .from('support_tickets')
    .select(`
      id, title, description, status, priority, external_priority_label, external_ticket_id,
      opened_at, resolved_at, closed_at, first_response_at, first_response_deadline,
      resolution_deadline, sla_breach_first_response, sla_breach_resolution, category, source,
      sla_events(id, event_type, occurred_at)
    `)
    .eq('id', id)
    .in('account_id', accounts.map((a) => a.id))   // só tickets das contas onde é stakeholder
    .single()

  if (!ticket) notFound()

  return (
    <div className="min-h-screen bg-surface-background">
      <PortalHeader accountName={account.name} accountLogoUrl={account.logo_url} accounts={accounts} currentAccountId={account.id} />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <PortalTicketDetailClient ticket={ticket} />
      </main>
    </div>
  )
}
