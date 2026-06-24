'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, Users, FileText, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { VocSignal } from '@/lib/voc/portfolio-voc'
import { NPSDetailModal } from '@/app/(dashboard)/accounts/[id]/components/NPSDetailModal'
import { fmtDate } from './voc-ui'

const INTERACTION_TYPE_LABEL: Record<string, string> = {
  meeting: 'Reunião', email: 'E-mail', qbr: 'QBR', onboarding: 'Onboarding',
  'health-check': 'Health Check', expansion: 'Expansão', 'churn-risk': 'Risco de Churn',
}

/**
 * Abre o DETALHE DA ORIGEM de um sinal de VOC (transcrição da reunião / feedback de NPS)
 * num modal, sem sair da tela. Somente leitura. Busca o registro completo em /api/voc/source.
 * Suporte/CSAT não passam por aqui (têm página própria de chamado).
 */
export function VocSourceModal({ signal, onClose }: { signal: VocSignal | null; onClose: () => void }) {
  const enabled = !!signal && (signal.source === 'interaction' || signal.source === 'nps')

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['voc-source', signal?.source, signal?.source_id],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/voc/source?source=${signal!.source}&id=${encodeURIComponent(signal!.source_id)}`)
      if (!res.ok) throw new Error('Falha ao carregar a origem')
      return res.json()
    },
  })

  if (!signal) return null

  // NPS → reaproveita o modal de NPS existente
  if (signal.source === 'nps') {
    const nps = data?.nps
    const render = nps
      ? { ...nps, account_name: signal.account_name, date: nps.responded_at || nps.created_at }
      : null
    if (isLoading) return <LoadingDialog onClose={onClose} title="Feedback de NPS" />
    if (!render) return <ErrorDialog onClose={onClose} />
    return <NPSDetailModal render={render} onOpenChange={(o) => { if (!o) onClose() }} />
  }

  // Interação → visão somente leitura (transcrição + metadados)
  const it = data?.interaction
  const meta = (it?.meta ?? {}) as Record<string, any>
  const participants = Array.isArray(meta.participants) ? meta.participants : null
  const reportUrl = typeof meta.report_url === 'string' ? meta.report_url : null
  const transcript: string | null = it?.raw_transcript || it?.summary || null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b border-border-divider bg-surface-background p-6 pr-10 space-y-1">
          <DialogTitle className="text-lg font-black text-content-primary tracking-tight">
            {it?.title || signal.evidence.title || 'Detalhe da interação'}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">
            {signal.account_name} · origem do sinal de voz
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>
        ) : isError || !it ? (
          <div className="py-20 text-center text-content-secondary text-sm">Não foi possível carregar a origem.</div>
        ) : (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Metadados */}
            <div className="flex flex-wrap items-center gap-2">
              {it.type && <Badge className="bg-surface-background border-border-divider text-content-secondary text-[10px] font-black uppercase tracking-tight">{INTERACTION_TYPE_LABEL[it.type] ?? it.type}</Badge>}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-content-secondary"><Calendar className="w-3.5 h-3.5" /> {fmtDate(it.date || it.created_at)}</span>
              {reportUrl && (
                <a href={reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-plannera-primary hover:underline ml-auto">
                  Read.ai <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {participants && participants.length > 0 && (
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-content-secondary"><Users className="w-3.5 h-3.5" /> Participantes</span>
                <p className="text-xs text-content-secondary">{participants.map((p: any) => p?.name ?? p?.email ?? '—').filter(Boolean).join(' · ')}</p>
              </div>
            )}

            {it.summary && (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Resumo</span>
                <p className="text-sm text-content-primary leading-relaxed">{it.summary}</p>
              </div>
            )}

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-content-secondary"><FileText className="w-3.5 h-3.5" /> Transcrição / texto-fonte</span>
              {transcript ? (
                <blockquote className="text-sm text-content-primary leading-relaxed border-l-2 border-plannera-orange/50 pl-3 italic whitespace-pre-wrap">
                  {transcript}
                </blockquote>
              ) : (
                <p className="text-xs text-content-secondary italic">Sem transcrição registrada.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LoadingDialog({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent aria-describedby={undefined} className="max-w-xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b border-border-divider bg-surface-background p-6"><DialogTitle className="text-lg font-black">{title}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>
      </DialogContent>
    </Dialog>
  )
}

function ErrorDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent aria-describedby={undefined} className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="border-b border-border-divider bg-surface-background p-6"><DialogTitle className="text-lg font-black">Origem</DialogTitle></DialogHeader>
        <div className="py-16 text-center text-content-secondary text-sm">Não foi possível carregar a origem.</div>
      </DialogContent>
    </Dialog>
  )
}
