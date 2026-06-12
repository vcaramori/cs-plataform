'use client'

import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { brlCompact, type CockpitKpis } from './risk-types'

export function RiskKpis({ kpis }: { kpis: CockpitKpis | null }) {
  const k = kpis ?? { arrAtRisk: 0, arrTotal: 0, accountsAtRisk: 0, critical: 0, high: 0, renewalsAtRisk: 0, renewalsAtRiskArr: 0, avgHealth: null, treatedPct: null }
  const arrPct = k.arrTotal > 0 ? Math.round((k.arrAtRisk / k.arrTotal) * 100) : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCardPremium
        title="ARR EM RISCO"
        value={k.arrTotal > 0 ? brlCompact(k.arrAtRisk) : 'R$ 0'}
        iconName="AlertTriangle"
        colorVariant={k.arrAtRisk > 0 ? 'destructive' : 'default'}
        status={k.arrTotal > 0 ? `${arrPct}% do ARR total` : 'Cadastre contratos'}
      />
      <StatCardPremium
        title="CONTAS EM RISCO"
        value={k.accountsAtRisk}
        iconName="ShieldAlert"
        colorVariant={k.accountsAtRisk > 0 ? 'destructive' : 'emerald'}
        status={`${k.critical} críticas · ${k.high} altas`}
      />
      <StatCardPremium
        title="RENOVAÇÕES EM RISCO"
        value={k.renewalsAtRisk}
        iconName="CalendarClock"
        colorVariant={k.renewalsAtRisk > 0 ? 'orange' : 'default'}
        status={k.renewalsAtRiskArr > 0 ? `${brlCompact(k.renewalsAtRiskArr)} ≤90d` : '≤90 dias'}
      />
      <StatCardPremium
        title="HEALTH MÉDIO"
        value={k.avgHealth ?? '—'}
        iconName="Activity"
        colorVariant={(k.avgHealth ?? 100) < 50 ? 'destructive' : (k.avgHealth ?? 100) < 70 ? 'orange' : 'emerald'}
        status="Portfólio (v2)"
      />
      <StatCardPremium
        title="EM TRATAMENTO"
        value={k.treatedPct != null ? `${k.treatedPct}%` : '—'}
        iconName="CheckCircle2"
        colorVariant={(k.treatedPct ?? 0) >= 70 ? 'emerald' : 'orange'}
        status="Risco com ação aberta"
      />
    </div>
  )
}
