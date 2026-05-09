'use client'

import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlignLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNPSSegment } from '@/lib/supabase/types'

interface ResponseDetailDialogProps {
  render: any
  onOpenChange: (open: boolean) => void
}

export function ResponseDetailDialog({ render, onOpenChange }: ResponseDetailDialogProps) {
  if (!render) return null

  const answers = render.nps_answers || []
  const seg = render.score !== null ? getNPSSegment(render.score) : null
  const segColor = seg === 'promoter' ? 'text-success bg-success/10 border-success-500/20' : seg === 'passive' ? 'text-warning bg-warning/10 border-warning-500/20' : 'text-destructive bg-destructive/10 border-destructive/20'

  return (
    <DialogContent aria-describedby={undefined} className="bg-background border-border max-w-xl p-0 overflow-hidden rounded-2xl shadow-2xl">
      <div className="p-8 space-y-8">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <DialogTitle className="h2-section !text-xl !text-foreground">Feedback Detalhado</DialogTitle>
            <p className="label-premium opacity-60">{render.account_name}</p>
          </div>
          <Badge className={`text-[10px] font-extrabold border uppercase px-3 py-1 rounded-2xl shadow-sm ${segColor}`}>
            {seg || 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="space-y-8 py-2">
          {/* Respondente */}
          <div className="flex items-center justify-between bg-surface-background p-4 rounded-2xl border border-border-divider">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
                <Input type="hidden" />
                <span className="text-content-primary font-extrabold text-xl">{render.user_email?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
              <div>
                <p className="text-content-primary text-sm font-extrabold tracking-tight">{render.user_email || 'Anônimo'}</p>
                <p className="label-premium !text-[9px] opacity-50 lowercase tracking-tight font-medium">
                  {render.responded_at ? new Date(render.responded_at).toLocaleString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="label-premium !text-[9px]">Nota NPS</p>
              <p className="text-3xl font-extrabold tracking-tighter text-content-primary">{render.score}<span className="text-xs opacity-60">/10</span></p>
            </div>
          </div>

          {/* Respostas */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-4 h-4 text-primary" />
              <p className="label-premium">Análise do Questionário</p>
            </div>

            {render.comment && (
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <p className="label-premium opacity-60 mb-1">Comentário Estruturado</p>
                <p className="text-foreground text-sm italic font-medium leading-relaxed tracking-tight">"{render.comment}"</p>
              </div>
            )}

            <div className="space-y-4">
              {answers.length === 0 && !render.comment ? (
                <div className="py-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center opacity-60">
                  <p className="label-premium">Sem dados detalhados</p>
                </div>
              ) : (
                answers.map((ans: any) => (
                  <div key={ans.id} className="space-y-2 p-5 rounded-2xl bg-surface-card border border-border-divider hover:bg-surface-background transition-all group">
                    <p className="label-premium !text-[9px] opacity-60 group-hover:opacity-100 transition-opacity">{ans.nps_questions?.title || 'Componente do Feedback'}</p>
                    <div className="text-content-primary text-sm font-extrabold tracking-tight leading-relaxed">
                      {ans.nps_questions?.type === 'nps_scale' ? (
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 bg-surface-background rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary" style={{ width: `${(parseInt(ans.text_value) / 10) * 100}%` }} />
                          </div>
                          <span className="text-primary font-extrabold tracking-tighter">{ans.text_value}<span className="text-[10px] opacity-60">/10</span></span>
                        </div>
                      ) : ans.nps_questions?.type === 'multiple_choice' ? (
                        <div className="flex flex-wrap gap-2">
                          {(ans.selected_options || []).map((opt: string) => (
                            <Badge key={opt} variant="neutral" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-extrabold uppercase tracking-widest px-3">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap font-medium text-muted-foreground">{ans.text_value || '—'}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-surface-background border-t border-border-divider flex justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-8 h-10 label-premium">
          Fechar Relatório
        </Button>
      </div>
    </DialogContent>
  )
}
