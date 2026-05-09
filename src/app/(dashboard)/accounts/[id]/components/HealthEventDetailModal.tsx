'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Heart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthEventDetailModalProps {
  healthEvent: any | null
  onOpenChange: (open: boolean) => void
}

export function HealthEventDetailModal({ healthEvent, onOpenChange }: HealthEventDetailModalProps) {
  if (!healthEvent) return null

  // Determinar status baseado no score
  const getStatusInfo = (score?: number) => {
    if (!score) return { label: 'Neutro', color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-500/10', borderColor: 'border-gray-100 dark:border-gray-500/20' }
    if (score > 75) return { label: 'Saudável', color: 'text-emerald-600 dark:text-success', bgColor: 'bg-emerald-50 dark:bg-success/10', borderColor: 'border-success-100 dark:border-success-500/20' }
    if (score >= 50) return { label: 'Em Risco', color: 'text-amber-600 dark:text-warning', bgColor: 'bg-amber-50 dark:bg-warning/10', borderColor: 'border-warning-100 dark:border-warning-500/20' }
    return { label: 'Crítico', color: 'text-destructive dark:text-red-500', bgColor: 'bg-red-50 dark:bg-red-500/10', borderColor: 'border-red-100 dark:border-red-500/20' }
  }

  const manualStatus = getStatusInfo(healthEvent.manual_score)
  const shadowStatus = getStatusInfo(healthEvent.shadow_score)

  // Breakdown do score (JSONB na DB, se disponível)
  const breakdown = healthEvent.breakdown || {}

  return (
    <Dialog open={!!healthEvent} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
                  Health Score Avaliação
                </DialogTitle>
                <DialogDescription className="text-content-secondary dark:text-content-secondary text-xs font-medium mt-1">
                  Detalhes da avaliação de saúde da conta
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="neutral"
              className={cn(
                'text-[9px] font-black uppercase tracking-widest border shrink-0',
                manualStatus.bgColor,
                manualStatus.borderColor
              )}
            >
              {manualStatus.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-8 py-8 space-y-6 overflow-y-auto max-h-[65vh]">
          {/* Data de Avaliação */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-surface-card dark:bg-slate-800">
                <CheckCircle className="w-4 h-4 text-slate-600 dark:text-content-secondary" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-content-primary dark:text-slate-300">
                Data da Avaliação
              </h3>
            </div>
            <Card variant="glass" className="p-4 rounded-xl">
              <p className="text-sm font-bold text-content-primary dark:text-slate-300">
                {new Date(healthEvent.evaluated_at).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </Card>
          </section>

          {/* Scores lado a lado */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-content-primary dark:text-slate-300">
                Score Total
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Manual Score */}
              <Card variant="glass" className={cn('p-6 rounded-xl border', manualStatus.borderColor)}>
                <div className="text-center space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Manual (CSM)
                  </div>
                  {healthEvent.manual_score !== null && healthEvent.manual_score !== undefined ? (
                    <>
                      <p className={cn('text-3xl font-black tracking-tighter', manualStatus.color)}>
                        {healthEvent.manual_score.toFixed(1)}/100
                      </p>
                      <Badge
                        variant="neutral"
                        className={cn(
                          'w-full justify-center text-[9px] font-black uppercase tracking-widest',
                          manualStatus.bgColor,
                          manualStatus.borderColor
                        )}
                      >
                        {manualStatus.label}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-sm text-content-secondary italic">Não avaliado</p>
                  )}
                  {healthEvent.manual_notes && (
                    <p className="text-[10px] text-slate-600 dark:text-content-secondary italic mt-3 pt-3 border-t border-border-divider">
                      {healthEvent.manual_notes}
                    </p>
                  )}
                </div>
              </Card>

              {/* Shadow Score (IA) */}
              <Card variant="glass" className={cn('p-6 rounded-xl border', shadowStatus.borderColor)}>
                <div className="text-center space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Shadow (IA)
                  </div>
                  {healthEvent.shadow_score !== null && healthEvent.shadow_score !== undefined ? (
                    <>
                      <p className={cn('text-3xl font-black tracking-tighter', shadowStatus.color)}>
                        {healthEvent.shadow_score.toFixed(1)}/100
                      </p>
                      <Badge
                        variant="neutral"
                        className={cn(
                          'w-full justify-center text-[9px] font-black uppercase tracking-widest',
                          shadowStatus.bgColor,
                          shadowStatus.borderColor
                        )}
                      >
                        {shadowStatus.label}
                      </Badge>
                    </>
                  ) : (
                    <p className="text-sm text-content-secondary italic">Não calculado</p>
                  )}
                </div>
              </Card>
            </div>
          </section>

          {/* Componentes do Shadow Score (se disponível) */}
          {(healthEvent.sentiment_component || healthEvent.ticket_component || healthEvent.engagement_component) && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-content-primary dark:text-slate-300">
                  Componentes IA
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {healthEvent.sentiment_component !== null && healthEvent.sentiment_component !== undefined && (
                  <Card variant="glass" className="p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                      Sentimento
                    </div>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-500">
                      {healthEvent.sentiment_component.toFixed(0)}%
                    </p>
                  </Card>
                )}
                {healthEvent.ticket_component !== null && healthEvent.ticket_component !== undefined && (
                  <Card variant="glass" className="p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                      Tickets
                    </div>
                    <p className="text-lg font-black text-amber-600 dark:text-warning">
                      {healthEvent.ticket_component.toFixed(0)}%
                    </p>
                  </Card>
                )}
                {healthEvent.engagement_component !== null && healthEvent.engagement_component !== undefined && (
                  <Card variant="glass" className="p-4 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                      Engajamento
                    </div>
                    <p className="text-lg font-black text-emerald-600 dark:text-success">
                      {healthEvent.engagement_component.toFixed(0)}%
                    </p>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* Shadow Reasoning (se disponível) */}
          {healthEvent.shadow_reasoning && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-surface-card dark:bg-slate-800">
                  <AlertCircle className="w-4 h-4 text-slate-600 dark:text-content-secondary" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-content-primary dark:text-slate-300">
                  Análise IA
                </h3>
              </div>
              <Card variant="glass" className="p-4 rounded-xl bg-surface-background/50 dark:bg-slate-800/20">
                <p className="text-[13px] leading-relaxed text-content-primary dark:text-slate-300">
                  {healthEvent.shadow_reasoning}
                </p>
              </Card>
            </section>
          )}

          {/* Discrepância Alert (se houver) */}
          {healthEvent.discrepancy_alert && healthEvent.discrepancy && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-warning-500/20 bg-amber-50 dark:bg-warning/10 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-warning/20 text-amber-600 dark:text-warning shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 tracking-tight uppercase">
                      Discrepância Detectada
                    </h3>
                    <p className="text-sm text-amber-900 dark:text-amber-200 opacity-80">
                      Diferença de <strong>{healthEvent.discrepancy.toFixed(1)}</strong> pontos entre Manual e Shadow Score.
                      Revisar e realinhar avaliações.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="p-6 bg-surface-background dark:bg-slate-800/50 border-t border-border-divider dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-content-secondary dark:text-content-secondary hover:text-[#2d3558] dark:hover:text-white"
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Voltar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
