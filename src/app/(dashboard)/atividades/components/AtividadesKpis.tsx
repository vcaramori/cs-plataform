'use client'

import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'

interface Props {
  /** Pendentes (não concluídas/canceladas) no escopo + filtro atuais. */
  open: number
  /** Pendentes com prazo já vencido. */
  overdue: number
  /** Pendentes que vencem hoje. */
  dueToday: number
  /** Pendentes que vencem nos próximos 7 dias. */
  week: number
}

/** Faixa de indicadores no topo de /atividades — reflete o escopo (CSM) e o cliente filtrados. */
export function AtividadesKpis({ open, overdue, dueToday, week }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCardPremium
        size="sm"
        title="ABERTAS"
        value={open}
        iconName="ListTodo"
        colorVariant="default"
        status="Pendentes no total"
      />
      <StatCardPremium
        size="sm"
        title="ATRASADAS"
        value={overdue}
        iconName="AlertTriangle"
        colorVariant={overdue > 0 ? 'destructive' : 'emerald'}
        status={overdue > 0 ? 'Vencidas — priorize' : 'Nada vencido'}
      />
      <StatCardPremium
        size="sm"
        title="PARA HOJE"
        value={dueToday}
        iconName="CalendarClock"
        colorVariant={dueToday > 0 ? 'orange' : 'default'}
        status="Vencem hoje"
      />
      <StatCardPremium
        size="sm"
        title="ESTA SEMANA"
        value={week}
        iconName="CalendarRange"
        colorVariant="default"
        status="Próximos 7 dias"
      />
    </div>
  )
}
