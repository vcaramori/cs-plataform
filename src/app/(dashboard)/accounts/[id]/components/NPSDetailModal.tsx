'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlignLeft, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNPSSegment } from '@/lib/supabase/types'

interface NPSDetailModalProps {
  render: any | null
  onOpenChange: (open: boolean) => void
}

export function NPSDetailModal({ render, onOpenChange }: NPSDetailModalProps) {
  if (!render) return null

  const answers = render.nps_answers || []
  const seg = render.score !== null ? getNPSSegment(render.score) : null
  const segColor = seg === 'promoter' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 
                   seg === 'passive' ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 
                   'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'

  return (
    <Dialog open={!!render} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xl p-0 overflow-hidden rounded-2xl shadow-2xl text-[#2d3558] dark:text-white">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-6 pr-10">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-black text-[#2d3558] dark:text-white uppercase tracking-tighter">Feedback de NPS</DialogTitle>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{render.account_name || 'Conta Cliente'}</p>
          </div>
          <Badge className={cn("text-[10px] font-black border uppercase px-3 py-1 rounded-full shadow-sm", segColor)}>
            {seg || 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="p-6 space-y-8">
          <div className="space-y-8">
            {/* Respondente e Nota */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                  <Star className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-[#2d3558] dark:text-white text-sm font-black tracking-tight">{render.user_email || 'Respondente Anônimo'}</p>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                    {render.date ? new Date(render.date).toLocaleString('pt-BR') : 'Sem data'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Nota NPS</p>
                <p className="text-4xl font-black tracking-tighter text-[#2d3558] dark:text-white">{render.score}<span className="text-sm text-slate-400 font-bold ml-1">/10</span></p>
              </div>
            </div>

            {/* Respostas */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Análise das Respostas</p>
              </div>

              {render.comment && (
                <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Comentário Aberto</p>
                  <p className="text-[#2d3558] dark:text-indigo-100 text-sm italic font-medium leading-relaxed tracking-tight">"{render.comment}"</p>
                </div>
              )}

              <div className="space-y-4">
                {answers.length === 0 && !render.comment ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sem dados adicionais</p>
                  </div>
                ) : (
                  answers.map((ans: any) => (
                    <div key={ans.id} className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                        {ans.nps_questions?.title || 'Componente do Feedback'}
                      </p>
                      <div className="text-[#2d3558] dark:text-white text-sm font-bold tracking-tight leading-relaxed">
                        {ans.nps_questions?.type === 'nps_scale' ? (
                          <div className="flex items-center gap-4">
                            <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${(parseInt(ans.text_value) / 10) * 100}%` }} />
                            </div>
                            <span className="text-indigo-500 font-black tracking-tighter">{ans.text_value}<span className="text-[10px] text-slate-400 ml-0.5">/10</span></span>
                          </div>
                        ) : ans.nps_questions?.type === 'multiple_choice' ? (
                          <div className="flex flex-wrap gap-2">
                            {(ans.selected_options || []).map((opt: string) => (
                              <Badge key={opt} variant="neutral" className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 text-[9px] font-black uppercase tracking-widest px-3">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">"{ans.text_value || '—'}"</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end rounded-b-2xl">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl px-8 h-10 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
          >
            Fechar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
