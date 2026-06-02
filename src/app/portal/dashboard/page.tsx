import { requirePortalAuth } from '@/lib/auth/require-portal-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PortalHeader } from '../_components/PortalHeader'
import { PortalDashboardClient } from './PortalDashboardClient'

export default async function PortalDashboardPage() {
  const { account, accounts, profile } = await requirePortalAuth()
  const db = getSupabaseAdminClient() as any

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [allTickets, recentClosed] = await Promise.all([
    db.from('support_tickets')
      .select('id, status, priority, opened_at, resolved_at, sla_breach_first_response, sla_breach_resolution, first_response_at, first_response_deadline')
      .eq('account_id', account.id),
    db.from('support_tickets')
      .select('id, opened_at, resolved_at')
      .eq('account_id', account.id)
      .in('status', ['resolved', 'closed'])
      .gte('resolved_at', thirtyDaysAgo),
  ])

  return (
    <div className="min-h-screen bg-surface-background">
      <PortalHeader accountName={account.name} accountLogoUrl={account.logo_url} accounts={accounts} currentAccountId={account.id} />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <PortalDashboardClient
          accountName={account.name}
          tickets={allTickets.data ?? []}
          recentClosed={recentClosed.data ?? []}
        />
      </main>
    </div>
  )
}
