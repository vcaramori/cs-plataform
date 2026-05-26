'use client'

import { SupportTicket } from '@/lib/supabase/types'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { TicketCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface SuporteKPIsProps {
  tickets: SupportTicket[]
}

export function SuporteKPIs({ tickets }: SuporteKPIsProps) {
  const openTickets = tickets.filter(t => ['open', 'in-progress', 'reopened'].includes(t.status))
  const breachedCount = openTickets.filter(t => t.sla_status_resolution === 'vencido' || t.sla_status_first_response === 'vencido').length
  const attentionCount = openTickets.filter(t => t.sla_status_resolution === 'atencao' || t.sla_status_first_response === 'atencao').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-700">
      <StatCardPremium
        title="Abertos"
        value={openTickets.length}
        icon={TicketCheck}
        colorVariant="sop"
        size="sm"
      />
      <StatCardPremium
        title="SLA Vencido"
        value={breachedCount}
        icon={AlertTriangle}
        colorVariant="destructive"
        size="sm"
      />
      <StatCardPremium
        title="SLA Atenção"
        value={attentionCount}
        icon={AlertTriangle}
        colorVariant="orange"
        size="sm"
      />
      <StatCardPremium
        title="Histórico Total"
        value={tickets.length}
        icon={CheckCircle2}
        colorVariant="ds"
        size="sm"
      />
    </div>
  )
}
