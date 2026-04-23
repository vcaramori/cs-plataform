import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingUp } from 'lucide-react'
import { env } from '@/lib/env'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface Props {
  directHours: number
  indirectHours: number
  mrr: number
  csmHourCost: number
}

export function CostToServeCard({ directHours, indirectHours, mrr, csmHourCost }: Props) {
  const totalHours = directHours + indirectHours
  const ratio = csmHourCost > 0 && mrr > 0
    ? (totalHours * csmHourCost) / mrr
    : 0

  const warn = env.thresholds.costToServeWarn
  const critical = env.thresholds.costToServeCritical

  const statusColor = ratio === 0 ? 'text-content-secondary' :
    ratio < warn ? 'text-emerald-400' :
    ratio < critical ? 'text-yellow-400' :
    'text-red-400'

  const statusLabel = ratio === 0 ? 'Sem dados' :
    ratio < warn ? 'Eficiente' :
    ratio < critical ? 'Atenção' :
    'Crítico'

  const barWidth = ratio === 0 ? 0 : Math.min((ratio / critical) * 100, 100)
  const barColor = ratio < warn ? 'bg-emerald-500' : ratio < critical ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-content-primary text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" /> Cost-to-Serve
          <span className="text-xs font-normal text-content-secondary ml-auto">mês atual</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <p className={`text-3xl font-bold ${statusColor}`}>
            {ratio === 0 ? '—' : `${(ratio * 100).toFixed(1)}%`}
          </p>
          <p className={`text-sm font-medium mt-1 ${statusColor}`}>{statusLabel}</p>
        </div>

        <div className="space-y-1">
          <div className="h-2 bg-surface-background rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
          </div>
          <div className="flex justify-between text-xs text-content-secondary">
            <span>0%</span>
            <span className="text-yellow-600">{(warn * 100).toFixed(0)}%</span>
            <span className="text-red-600">{(critical * 100).toFixed(0)}%+</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-sm">
            <span className="text-content-secondary flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Direto</span>
            <span className="text-content-primary font-medium">{formatNumber(directHours)}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-content-secondary flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Indireto</span>
            <span className="text-content-primary font-medium">{formatNumber(indirectHours)}h</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border-divider pt-2">
            <span className="text-content-primary font-medium">Total</span>
            <span className="text-content-primary font-bold">{formatNumber(totalHours)}h</span>
          </div>
          {csmHourCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Custo Total</span>
              <span className="text-content-primary font-medium">{formatCurrency(totalHours * csmHourCost)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
