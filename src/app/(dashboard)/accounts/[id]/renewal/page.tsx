import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import RenewalCockpitClient from './components/RenewalCockpitClient'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function RenewalPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, company_name, health_score_v2, segment')
    .eq('id', id)
    .single()

  if (!account) redirect('/accounts')

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, mrr, arr, renewal_date, service_type, status')
    .eq('account_id', id)
    .single()

  const daysToRenewal = contract?.renewal_date
    ? Math.ceil(
        (new Date(contract.renewal_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-border-divider p-6">
          <h1 className="text-3xl font-bold text-content-primary">{account.name}</h1>
          <p className="text-slate-600 mt-1">{account.company_name}</p>
          <div className="flex gap-4 mt-4">
            <div className="flex flex-col">
              <span className="text-xs text-content-secondary uppercase">Health Score</span>
              <span className="text-2xl font-bold text-emerald-600">{account.health_score_v2 || 0}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-content-secondary uppercase">Days to Renewal</span>
              <span className={`text-2xl font-bold ${
                daysToRenewal && daysToRenewal <= 30 ? 'text-destructive' :
                daysToRenewal && daysToRenewal <= 90 ? 'text-amber-600' : 'text-slate-600'
              }`}>{daysToRenewal ?? 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-content-secondary uppercase">ARR</span>
              <span className="text-2xl font-bold">${(contract?.arr || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-80 rounded-lg" />}>
          <RenewalCockpitClient accountId={id} contract={contract} />
        </Suspense>
      </div>
    </div>
  )
}
