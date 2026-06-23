'use client'

import Link from 'next/link'
import { ExternalLink, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VocSignal } from '@/lib/voc/portfolio-voc'
import { POLARITY_META, SOURCE_META, fmtDate } from './voc-ui'

/**
 * Cartão de Evidência — "como este sentimento foi avaliado".
 * Renderiza qualquer VocSignal (reunião/Read.ai, interação, suporte, NPS, CSAT)
 * mostrando: origem da avaliação, nota+escala, texto-fonte, keywords, e link p/ a fonte.
 */
export function SignalEvidence({ signal }: { signal: VocSignal }) {
  const ev = signal.evidence
  const pol = POLARITY_META[signal.polarity]
  const Src = SOURCE_META[signal.source].icon
  const meta = (ev.meta ?? {}) as Record<string, any>
  const participants = Array.isArray(meta.participants) ? meta.participants : null

  return (
    <div className="space-y-4">
      {/* Cabeçalho: origem da avaliação + polaridade */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-2 rounded-lg shrink-0', pol.bg)}>
            <Src className="w-4 h-4 text-content-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">{SOURCE_META[signal.source].label}</p>
            <p className="text-sm font-bold text-content-primary truncate">{ev.title ?? signal.account_name}</p>
          </div>
        </div>
        <span className={cn('text-sm font-black shrink-0', pol.text)}>{pol.emoji} {pol.label}</span>
      </div>

      {/* Como foi avaliado */}
      <div className="rounded-xl border border-border-divider bg-surface-background p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Como foi avaliado</span>
          <Badge className="bg-plannera-primary/10 text-plannera-primary border-plannera-primary/20 text-[9px] font-black uppercase tracking-tight">{ev.evaluated_by_label}</Badge>
        </div>
        <p className="text-xs text-content-secondary">{ev.scale}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {ev.raw_score != null && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary">Nota</span>
              <p className="text-lg font-black text-content-primary tabular-nums leading-none">{ev.raw_score}</p>
            </div>
          )}
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary">Sentimento (−1..1)</span>
            <p className={cn('text-lg font-black tabular-nums leading-none', pol.text)}>{signal.score > 0 ? '+' : ''}{signal.score.toFixed(2)}</p>
          </div>
          {ev.confidence != null && (
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary">Confiança</span>
              <p className="text-lg font-black text-content-primary tabular-nums leading-none">{Math.round(ev.confidence * 100)}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Texto-fonte */}
      {ev.excerpt && (
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Texto-fonte</span>
          <blockquote className="text-sm text-content-primary leading-relaxed border-l-2 border-plannera-orange/50 pl-3 italic whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
            {ev.excerpt}
          </blockquote>
        </div>
      )}

      {/* Keywords / tags */}
      {ev.keywords.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">{signal.source === 'nps' ? 'Tags' : 'Palavras-chave'}</span>
          <div className="flex flex-wrap gap-1.5">
            {ev.keywords.map((k, i) => (
              <Badge key={`${k}-${i}`} className="bg-surface-background border-border-divider text-content-secondary text-[10px] font-medium">{k}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Detalhes específicos da fonte */}
      {participants && participants.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Participantes</span>
          <p className="text-xs text-content-secondary">{participants.map((p: any) => p?.name ?? p?.email ?? '—').filter(Boolean).join(' · ')}</p>
        </div>
      )}

      {/* Rodapé: conta, data e links */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-divider">
        <span className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">{signal.account_name} · {fmtDate(signal.date)}</span>
        <div className="flex items-center gap-2">
          {typeof meta.report_url === 'string' && (
            <a href={meta.report_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-plannera-primary hover:underline">
              Read.ai <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {ev.deep_link && (
            <Link href={ev.deep_link} className="inline-flex items-center gap-1 text-[11px] font-bold text-plannera-orange hover:underline">
              Abrir fonte <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
          <Link href={`/voc/${signal.account_id}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-content-secondary hover:text-content-primary hover:underline">
            Ver conta
          </Link>
        </div>
      </div>
    </div>
  )
}
