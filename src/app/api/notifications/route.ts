import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { subDays } from 'date-fns'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  // 1. Busca Scores Desatualizados (> 30 dias)
  // Nota: Precisamos buscar o último manual_score de cada conta do usuário
  const { data: staleScores, error: errorStale } = await supabase.rpc('get_stale_health_checks', {
    csm_id: user.id,
    days_limit: 30
  })

  // Fallback se a RPC não existir ou falhar: busca manual (menos performático mas seguro)
  let notifications: any[] = []

  if (errorStale || !staleScores) {
    // Se a RPC falhar, fazemos um JOIN manual básico
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('csm_owner_id', user.id)

    if (accounts) {
        for (const acc of accounts) {
            const { data: latest } = await supabase
                .from('health_scores')
                .select('evaluated_at')
                .eq('account_id', acc.id)
                .not('manual_score', 'is', null)
                .order('evaluated_at', { ascending: false })
                .limit(1)
                .single()
            
            if (latest && new Date(latest.evaluated_at) < new Date(thirtyDaysAgo)) {
                notifications.push({
                    id: `stale-${acc.id}`,
                    type: 'stale_score',
                    title: 'Health Score Desatualizado',
                    description: `A conta ${acc.name} não recebe atualização manual há mais de 30 dias.`,
                    account_id: acc.id,
                    account_name: acc.name,
                    severity: 'warning'
                })
            }
        }
    }
  } else {
    notifications = staleScores.map((s: any) => ({
      id: `stale-${s.account_id}`,
      type: 'stale_score',
      title: 'Health Score Desatualizado',
      description: `A conta ${s.account_name} não recebe atualização manual há mais de 30 dias.`,
      account_id: s.account_id,
      account_name: s.account_name,
      severity: 'warning'
    }))
  }

  // 2. Busca Discrepâncias Ativas
  const { data: discrepancies } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)
    .eq('discrepancy_alert', true)

  if (discrepancies) {
    discrepancies.forEach(d => {
      notifications.push({
        id: `discrepancy-${d.id}`,
        type: 'discrepancy',
        title: 'Discrepância Detectada',
        description: `O Shadow Score da conta ${d.name} diverge significativamente do manual.`,
        account_id: d.id,
        account_name: d.name,
        severity: 'critical'
      })
    })
  }

  return NextResponse.json({ notifications })
}
