'use client'

import { useEffect, useState } from 'react'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'

type Card = { arr: number; readiness_color: 'green' | 'yellow' | 'red'; days_to_renewal: number }
type Pipeline = { critico: Card[]; urgente: Card[]; planejamento: Card[] }

const EMPTY: Pipeline = { critico: [], urgente: [], planejamento: [] }

export function RenewalsSummary() {
  const [pipeline, setPipeline] = useState<Pipeline>(EMPTY)

  useEffect(() => {
    fetch('/api/dashboard/renewal-pipeline')
      .then(r => r.json())
      .then(d => setPipeline(d?.critico ? d : EMPTY))
      .catch(() => setPipeline(EMPTY))
  }, [])

  const all = [...pipeline.critico, ...pipeline.urgente, ...pipeline.planejamento]
  const total = all.length
  const arrAtRisk = all.filter(c => c.readiness_color === 'red').reduce((s, c) => s + (c.arr || 0), 0)
  const overdue = all.filter(c => c.days_to_renewal < 0).length
  const ready = all.filter(c => c.readiness_color === 'green').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCardPremium title="RENOVAÇÕES (90D)" value={total} iconName="CalendarClock" colorVariant="default" status="Próximos 90 dias" />
      <StatCardPremium title="ARR EM RISCO" value={arrAtRisk} prefix="R$ " iconName="AlertTriangle" colorVariant={arrAtRisk > 0 ? 'destructive' : 'default'} status="Prontidão vermelha" />
      <StatCardPremium title="VENCIDAS" value={overdue} iconName="Clock" colorVariant={overdue > 0 ? 'destructive' : 'default'} status="Renovação vencida" />
      <StatCardPremium title="PRONTAS" value={ready} iconName="CheckCircle2" colorVariant="emerald" status="Prontidão verde" />
    </div>
  )
}
