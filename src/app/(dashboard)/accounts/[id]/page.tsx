import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AccountHeader } from './components/AccountHeader'
import { ContractCard } from './components/ContractCard'
import { ContactsPowerMap } from './components/ContactsPowerMap'
import { InteractionsList } from './components/InteractionsList'
import { CostToServeCard } from './components/CostToServeCard'

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data: account, error } = await supabase
    .from('accounts')
    .select(`
      *,
      contracts (*),
      contacts (*),
      interactions (*, time_entries(*)),
      support_tickets (*),
      health_scores (*)
    `)
    .eq('id', id)
    .single()

  if (error || !account) notFound()

  const activeContract = (account.contracts as any[])?.find((c: any) => c.status === 'active') ?? (account.contracts as any[])?.[0] ?? null
  const contacts = (account.contacts as any[]) ?? []
  const interactions = (account.interactions as any[]) ?? []
  const tickets = (account.support_tickets as any[]) ?? []

  // Cost-to-Serve: horas do mês atual
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const directHoursMonth = interactions
    .filter((i: any) => i.date >= firstOfMonth)
    .reduce((sum: number, i: any) => sum + Number(i.direct_hours ?? 0), 0)

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('parsed_hours')
    .eq('account_id', id)
    .gte('date', firstOfMonth)
  const indirectHoursMonth = (timeEntries ?? []).reduce((sum, t) => sum + Number(t.parsed_hours ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <AccountHeader
        account={account as any}
        latestHealthScore={(account as any).health_scores?.[0] ?? null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeContract && <ContractCard contract={activeContract} />}
          <InteractionsList interactions={interactions} tickets={tickets} accountId={id} contractId={activeContract?.id ?? null} />
        </div>
        <div className="space-y-6">
          {activeContract && (
            <CostToServeCard
              directHours={directHoursMonth}
              indirectHours={indirectHoursMonth}
              mrr={Number(activeContract.mrr)}
              csmHourCost={Number(activeContract.csm_hour_cost)}
            />
          )}
          <ContactsPowerMap contacts={contacts} accountId={id} />
        </div>
      </div>
    </div>
  )
}
