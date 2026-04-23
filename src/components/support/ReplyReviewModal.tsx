'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Minus, X, Sparkles, User, BookOpen, Clock, Wrench, CheckCheck, Minus as MinusIcon } from 'lucide-react'
import type { ReplyReviewResult } from '@/app/api/support-tickets/review-reply/route'

const OUTCOME_CFG = {
  pending_client:  { label: 'Aguardando Cliente',  color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20',  icon: Clock },
  pending_product: { label: 'Aguardando Produto',  color: 'text-indigo-400',  bg: 'bg-indigo-500/8',  border: 'border-indigo-500/20', icon: Wrench },
  solution:        { label: 'Resolver Chamado',    color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',icon: CheckCheck },
  none:            { label: 'Manter Aberto',       color: 'text-slate-400',   bg: 'bg-white/[0.03]',  border: 'border-white/[0.06]',  icon: MinusIcon },
} as const

interface Props {
  open: boolean
  originalText: string
  review: ReplyReviewResult | null
  onSelectOriginal: () => void
  onSelectRecommended: () => void
  onClose: () => void
}

const SENTIMENT = {
  Equilibrado: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', icon: CheckCircle2 },
  Neutro:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   icon: Minus },
  Rígido:      { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/25',     icon: AlertTriangle },
}

function grade(v: number) {
  if (v >= 8) return { text: 'text-emerald-400', fill: 'bg-emerald-400', muted: 'text-emerald-400/40' }
  if (v >= 6) return { text: 'text-amber-400',   fill: 'bg-amber-400',   muted: 'text-amber-400/40' }
  return         { text: 'text-rose-400',    fill: 'bg-rose-500',    muted: 'text-rose-400/40' }
}

/** One score card in the strip */
function ScoreCard({ label, value }: { label: string; value: number }) {
  const g = grade(value)
  const pct = (value / 10) * 100
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex-1 min-w-0">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">
        {label}
      </span>
      <span className={cn('text-[20px] font-extrabold leading-none tabular-nums', g.text)}>
        {value}
      </span>
      <div className="w-full h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', g.fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ModalContent({ originalText, review, onSelectOriginal, onSelectRecommended, onClose }: Omit<Props, 'open'>) {
  const [showEval, setShowEval] = useState(false)
  const sent = review ? (SENTIMENT[review.sentiment] ?? SENTIMENT.Neutro) : SENTIMENT.Neutro
  const SentIcon = sent.icon
  const ng = review?.nota_final != null ? grade(review.nota_final) : null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex flex-col w-full max-w-[1160px] bg-slate-950 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        style={{ zIndex: 1, height: 'min(90vh, 820px)' }}
      >

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ZONE 1 — Header: identidade + veredicto
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-[13px] font-bold text-brand-primary dark:text-white uppercase tracking-widest">
              Revisão da Resposta
            </span>
            {review?.show_alert && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-none">Revisão apenas textual</span>
              </div>
            )}
          </div>

          {/* Verdict + close */}
          <div className="flex items-center gap-2.5">
            {review && ng && review.nota_final != null && (
              <>
                {/* Nota Final */}
                <div className={cn('flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl border', sent.bg, sent.border)}>
                  <span className={cn('text-[22px] font-extrabold leading-none tabular-nums', ng.text)}>
                    {review.nota_final.toFixed(1)}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Nota Final</span>
                </div>

                {/* Sentimento */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold', sent.bg, sent.border, sent.color)}>
                  <SentIcon className="w-3.5 h-3.5" />
                  {review.sentiment}
                </div>
              </>
            )}

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-primary dark:text-white hover:bg-white/5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {!review && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-9 h-9 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
            <p className="text-[11px] text-slate-500 uppercase tracking-widest">Analisando com o Padrão Plannera…</p>
          </div>
        )}

        {review && (
          <>
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ZONE 2 — Score strip: 7 cards side by side
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] bg-black/20">
              <div className="flex items-stretch gap-2">
                {/* Avaliação: 5 cards */}
                <ScoreCard label="Tom"         value={review.evaluation.tom} />
                <ScoreCard label="Estrutura"   value={review.evaluation.estrutura} />
                <ScoreCard label="Empatia"     value={review.evaluation.empatia} />
                <ScoreCard label="Clareza"     value={review.evaluation.clareza} />
                <ScoreCard label="Alinhamento" value={review.evaluation.alinhamento} />

                {/* Divider */}
                <div className="w-px bg-white/[0.07] mx-1 self-stretch" />

                {/* Pilares: 2 cards */}
                <ScoreCard label="Comunicação" value={review.pillar_scores.habilidades_comunicacao} />
                <ScoreCard label="Efetividade" value={review.pillar_scores.efetividade_respostas} />
              </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ZONE 3 — Treinamento + Avaliação colapsável
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="shrink-0 px-5 py-3 border-b border-white/[0.05]">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Training Notes + toggle */}
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1 leading-none">Nota de Treinamento</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{review.training_notes}</p>
                  </div>
                  <button
                    onClick={() => setShowEval(v => !v)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-colors text-slate-400 border-white/10 hover:text-brand-primary dark:text-white hover:border-white/20"
                  >
                    {showEval ? 'Ocultar' : 'Ver detalhes'}
                  </button>
                </div>

                {/* Collapsible Evaluation */}
                {showEval && (
                  <>
                    <div className="h-px bg-white/[0.05] mx-4" />
                    <div className="px-4 pt-2.5 pb-3">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Avaliação</p>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{review.feedback_summary}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ZONE 3b — Status suggestion
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {review.suggested_outcome && (() => {
              const cfg = OUTCOME_CFG[review.suggested_outcome] ?? OUTCOME_CFG.none
              const Icon = cfg.icon
              return (
                <div className={cn('shrink-0 mx-5 mb-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border', cfg.bg, cfg.border)}>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest shrink-0">IA Sugere · Status</span>
                  <div className={cn('flex items-center gap-1.5 text-[11px] font-bold', cfg.color)}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cfg.label}
                  </div>
                  {review.outcome_reasoning && (
                    <span className="text-[10px] text-slate-500 ml-0.5 truncate">— {review.outcome_reasoning}</span>
                  )}
                </div>
              )
            })()}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                ZONE 4 — Texts
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
              {/* Original */}
              <div className="flex flex-col flex-1 min-h-0 min-w-0 px-5 pt-4 pb-4">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2 shrink-0">
                  <User className="w-3 h-3" /> Sua versão
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto bg-black/25 border border-white/[0.06] rounded-xl p-4 text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {originalText}
                </div>
                <Button
                  onClick={onSelectOriginal}
                  variant="outline"
                  size="sm"
                  className="mt-3 shrink-0 w-full border-white/10 text-slate-400 hover:text-brand-primary dark:text-white hover:border-white/20 text-[10px] font-bold uppercase tracking-widest h-9"
                >
                  Usar minha versão
                </Button>
              </div>

              <div className="hidden sm:block w-px bg-white/[0.05] shrink-0 my-4" />
              <div className="block sm:hidden h-px bg-white/[0.05] shrink-0 mx-5" />

              {/* Recommended */}
              <div className="flex flex-col flex-1 min-h-0 min-w-0 px-5 pt-4 pb-4">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-2 shrink-0">
                  <Sparkles className="w-3 h-3" /> Versão recomendada pela IA
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto bg-indigo-950/20 border border-indigo-500/15 rounded-xl p-4 text-[12.5px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {review.recommended_version}
                </div>
                <Button
                  onClick={onSelectRecommended}
                  size="sm"
                  className="mt-3 shrink-0 w-full bg-indigo-600 hover:bg-indigo-500 text-brand-primary dark:text-white text-[10px] font-bold uppercase tracking-widest gap-1.5 h-9"
                >
                  <Sparkles className="w-3 h-3" /> Usar versão da IA
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function ReplyReviewModal(props: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!props.open || !mounted) return null
  return createPortal(
    <ModalContent
      originalText={props.originalText}
      review={props.review}
      onSelectOriginal={props.onSelectOriginal}
      onSelectRecommended={props.onSelectRecommended}
      onClose={props.onClose}
    />,
    document.body,
  )
}

