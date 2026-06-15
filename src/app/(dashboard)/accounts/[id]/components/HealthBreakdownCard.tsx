'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Zap, Users, Clock } from 'lucide-react'
import type { HealthBreakdown } from '@/lib/supabase/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'

interface Props {
  breakdown?: HealthBreakdown
  status?: 'healthy' | 'at-risk' | 'critical'
  classifiedAt?: string
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-success/20 text-emerald-300'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-300'
  return 'bg-red-500/20 text-red-300'
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case 'healthy':
      return 'bg-success/20 text-emerald-300 border-success-500/30'
    case 'at-risk':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'critical':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    default:
      return 'bg-surface-background0/20 text-slate-300 border-slate-500/30'
  }
}

function StatusLabel({ status }: { status?: string }) {
  const labels: Record<string, string> = {
    'healthy': 'Saudável',
    'at-risk': 'Em Risco',
    'critical': 'Crítico',
  }
  return labels[status ?? ''] || 'Não Classificado'
}

export function HealthBreakdownCard({ breakdown, status, classifiedAt }: Props) {
  if (!breakdown) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-content-primary text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Health Score Ponderado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center gap-1.5 px-4 text-content-secondary dark:text-content-secondary">
            <span className="text-sm font-bold">Automático — aguardando processamento</span>
            <span className="text-xs leading-snug">Score ponderado (SLA / NPS / Adoção / Relacionamento) ainda não calculado. A fonte da verdade é o <strong>Health manual</strong> do card ao lado.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const dimensions = [
    {
      label: 'SLA Compliance',
      value: breakdown.sla,
      icon: Zap,
      description: '% de tickets resolvidos no prazo (30d)',
      tooltipText: 'Percentage of support tickets resolved within SLA in the last 30 days'
    },
    {
      label: 'NPS Score',
      value: breakdown.nps,
      icon: Users,
      description: 'Escore NPS normalizado',
      tooltipText: 'Normalized NPS from customer feedback (0-100 scale)'
    },
    {
      label: 'Adoption',
      value: breakdown.adoption,
      icon: Activity,
      description: '% features ativas do plano',
      tooltipText: 'Percentage of available features actively used'
    },
    {
      label: 'Relationship',
      value: breakdown.relationship,
      icon: Clock,
      description: 'Frequência de contato (30d)',
      tooltipText: 'Interaction frequency: 1-7d=100, 8-14d=75, 15-21d=50, 22-30d=25'
    },
  ]

  const weights = [0.35, 0.30, 0.25, 0.10]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-content-primary text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Health Score Ponderado
          </CardTitle>
          {status && (
            <Badge className={`text-xs border ${getStatusBadgeClass(status)}`}>
              <StatusLabel status={status} />
            </Badge>
          )}
        </div>
        {classifiedAt && (
          <p className="text-content-secondary text-xs mt-2">
            Atualizado em {new Date(classifiedAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 4 Dimension Bars */}
        <div className="space-y-4">
          {dimensions.map((dim, idx) => {
            const Icon = dim.icon
            const weight = weights[idx]
            const bgColor = getScoreColor(dim.value)
            const textColor = getScoreTextColor(dim.value)

            return (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-2 cursor-help">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", textColor)} />
                          <div className="flex flex-col">
                            <span className="text-content-primary font-bold text-sm">{dim.label}</span>
                            <span className="text-content-secondary text-xs">{dim.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-black text-base px-2 py-1 rounded-lg", bgColor)}>
                            {Math.round(dim.value)}
                          </span>
                          <span className="text-content-secondary text-xs font-bold">
                            ({(weight * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", textColor.replace('text-', 'bg-'))}
                          style={{ width: `${dim.value}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{dim.tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Calculation Info */}
        <div className="mt-6 pt-4 border-t border-border-divider">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/10">
            <div className="flex flex-col">
              <span className="text-content-secondary text-xs uppercase font-extrabold tracking-widest">Fórmula Ponderada</span>
              <span className="text-content-primary text-sm font-mono mt-1">
                (SLA×0.35) + (NPS×0.30) + (Adopt×0.25) + (Relat×0.10)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
