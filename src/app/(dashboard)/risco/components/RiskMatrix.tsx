'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { LEVEL_HEX, LEVEL_LABEL, brl, type AccountRiskProfile, type RiskLevel } from './risk-types'

const LEVELS: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'none']

function toPoint(a: AccountRiskProfile) {
  const health = a.health ?? 50
  const aiRisk = a.aiRisk ?? (a.health != null ? Math.max(0, 100 - a.health) : 50)
  return { x: aiRisk, y: health, z: Math.max(a.arr, 1), id: a.id, name: a.name, arr: a.arr, aiRisk: a.aiRisk, health: a.health, level: a.riskLevel }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MatrixTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-border-divider bg-surface-card p-2 text-xs shadow-lg">
      <p className="font-bold text-content-primary">{p.name}</p>
      <p className="text-content-secondary">Health: {p.health ?? '—'} · Risco IA: {p.aiRisk ?? '—'}</p>
      <p className="text-content-secondary">{LEVEL_LABEL[p.level as RiskLevel]}{p.arr > 0 ? ` · ${brl(p.arr)} ARR` : ''}</p>
    </div>
  )
}

export function RiskMatrix({ accounts }: { accounts: AccountRiskProfile[] }) {
  const router = useRouter()
  const data = accounts.filter(a => !a.curatedFalsePositive)

  return (
    <Card className="p-5 border-border-divider">
      <div className="mb-3">
        <p className="font-bold text-sm text-content-primary">Matriz de Risco do Portfólio</p>
        <p className="text-xs text-content-secondary">Saúde × Risco da IA — tamanho da bolha = ARR. Zona crítica no canto inferior direito (baixa saúde + alto risco).</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-content-secondary">Sem contas para plotar.</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            {/* Zona crítica destacada */}
            <ReferenceArea x1={60} x2={100} y1={0} y2={40} fill="#ef4444" fillOpacity={0.06} />
            <CartesianGrid strokeDasharray="3 3" className="stroke-border-divider" />
            <XAxis type="number" dataKey="x" name="Risco IA" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Risco IA →', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Health" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Health ↑', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[60, 500]} name="ARR" />
            <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={60} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine x={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            {LEVELS.map(level => (
              <Scatter
                key={level}
                name={LEVEL_LABEL[level]}
                data={data.filter(a => a.riskLevel === level).map(toPoint)}
                fill={LEVEL_HEX[level]}
                fillOpacity={0.75}
                onClick={(p: any) => p?.id && router.push(`/accounts/${p.id}`)}
                className="cursor-pointer"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
