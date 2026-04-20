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

  // 3. Busca Alertas de SLA (Atenção ou Vencido)
  const { data: slaAlerts } = await supabase
    .from('support_tickets')
    .select('id, title, sla_status_first_response, sla_status_resolution, sla_breach_first_response, sla_breach_resolution, account_id, accounts!inner(name, csm_owner_id)')
    .eq('accounts.csm_owner_id', user.id)
    .or('sla_status_first_response.eq.vencido,sla_status_first_response.eq.atencao,sla_status_resolution.eq.vencido,sla_status_resolution.eq.atencao')

  if (slaAlerts) {
    slaAlerts.forEach(t => {
      const isBreached = t.sla_status_first_response === 'vencido' || t.sla_status_resolution === 'vencido'
      notifications.push({
        id: `sla-${t.id}`,
        type: 'sla_alert',
        title: isBreached ? 'SLA VIOLADO' : 'SLA EM ATENÇÃO',
        description: `O ticket "${t.title}" requer ação imediata para evitar/mitigar atrasos.`,
        account_id: t.account_id,
        account_name: (t.accounts as any).name,
        severity: isBreached ? 'critical' : 'warning'
      })
    })
  }

  // 4. Busca Novos Chamados (Abertos e não atribuídos ou sem resposta)
  const { data: newTickets } = await supabase
    .from('support_tickets')
    .select('id, title, created_at, account_id, accounts!inner(name, csm_owner_id)')
    .eq('accounts.csm_owner_id', user.id)
    .eq('status', 'open')
    .is('assigned_to', null)
    .is('first_response_at', null)
    .order('created_at', { ascending: false })
  if (newTickets) {
    newTickets.forEach(t => {
      notifications.push({
        id: `new-ticket-${t.id}`,
        type: 'new_ticket',
        title: 'Novo Chamado Recebido',
        description: `O ticket "${t.title}" foi aberto e aguarda triagem/atribuição.`,
        account_id: t.account_id,
        account_name: (t.accounts as any).name,
        severity: 'info',
        created_at: t.created_at
      })
    })
  }

  // 5. Busca Agendamentos de Follow-up (Próximos 30 minutos)
  const thirtyMinsFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const nowStr = new Date().toISOString()

  const { data: upcomingSchedules } = await supabase
    .from('support_schedules')
    .select('id, target_time, reason, ticket_id, support_tickets!inner(title, account_id, accounts!inner(name))')
    .eq('completed', false)
    .eq('notified', false)
    .lte('target_time', thirtyMinsFromNow)
    .gte('target_time', nowStr)

  if (upcomingSchedules) {
    upcomingSchedules.forEach((s: any) => {
      notifications.push({
        id: `schedule-${s.id}`,
        type: 'follow_up_alert',
        title: 'Lembrete de Follow-up',
        description: `Promessa de retorno para "${s.support_tickets.title}" em breve (${new Date(s.target_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        account_id: s.support_tickets.account_id,
        account_name: s.support_tickets.accounts.name,
        severity: 'info',
        metadata: { ticket_id: s.ticket_id, schedule_id: s.id }
      })
    })
  }

  return NextResponse.json({ notifications })
}

