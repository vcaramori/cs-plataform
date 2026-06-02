import { requirePortalAuth } from '@/lib/auth/require-portal-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PortalHeader } from '../_components/PortalHeader'
import { PortalTicketsClient } from './PortalTicketsClient'

export default async function PortalTicketsPage() {
  const { account, accounts } = await requirePortalAuth()
  const db = getSupabaseAdminClient() as any

  const { data: tickets } = await db
    .from('support_tickets')
    .select('id, title, status, priority, external_priority_label, external_ticket_id, opened_at, resolved_at, first_response_at, first_response_deadline, resolution_deadline, sla_breach_first_response, sla_breach_resolution, category')
    .eq('account_id', account.id)
    .order('opened_at', { ascending: false })

  return (
    <div className="min-h-screen bg-surface-background">
      <PortalHeader accountName={account.name} accountLogoUrl={account.logo_url} accounts={accounts} currentAccountId={account.id} />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <PortalTicketsClient tickets={tickets ?? []} accountName={account.name} />
      </main>
    </div>
  )
}
