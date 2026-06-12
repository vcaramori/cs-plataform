'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Loader2, Check, X, Copy, ArrowUpRight, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  analyzeSignal, triageAlreadyAvailable, dismissSignal, markDuplicate,
  promoteToNewItem, promoteToExistingItem, type SignalInsights,
} from '../actions'
import { OPP_TYPE_LABELS, SOURCE_LABELS, type OppTypeKey } from './labels'

type SignalRow = {
  id: string; account_id: string; source_type: string; verbatim: string; summary: string | null
  opportunity_type: OppTypeKey; ai_confidence: number | null; requester_name: string | null
  created_at: string; accounts: { name: string } | null
}

export function OpportunityTriageInbox({ pendingSignals }: { pendingSignals: SignalRow[] }) {
  if (pendingSignals.length === 0) {
    return <Card className="p-10 text-center"><p className="text-sm text-content-secondary">Nada na triagem. Sinais comerciais aparecem aqui conforme reuniões/esforços/NPS são registrados.</p></Card>
  }
  return (
    <div className="space-y-2">
      {pendingSignals.map((s) => <SignalCard key={s.id} signal={s} />)}
    </div>
  )
}

function SignalCard({ signal }: { signal: SignalRow }) {
  const router = useRouter()
  const [insights, setInsights] = useState<SignalInsights | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [title, setTitle] = useState(signal.summary || signal.verbatim.slice(0, 80))

  const run = async (key: string, fn: () => Promise<any>, okMsg?: string) => {
    setBusy(key)
    try { await fn(); if (okMsg) toast.success(okMsg); router.refresh() }
    catch (e: any) { toast.error(e?.message ?? 'Falha') }
    finally { setBusy(null) }
  }

  return (
    <Card className="p-4 border-border-divider">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Badge variant="outline" className="text-[9px] uppercase">{signal.accounts?.name ?? '—'}</Badge>
        <Badge variant="outline" className="text-[9px] uppercase text-content-secondary">{SOURCE_LABELS[signal.source_type] ?? signal.source_type}</Badge>
        <Badge className="text-[9px] uppercase border-none bg-accent/15 text-accent">{OPP_TYPE_LABELS[signal.opportunity_type] ?? signal.opportunity_type}</Badge>
        {signal.ai_confidence != null && <span className="text-[10px] text-content-secondary">conf. {(signal.ai_confidence * 100).toFixed(0)}%</span>}
      </div>
      <p className="text-sm font-medium text-content-primary">{signal.summary}</p>
      {signal.verbatim && signal.verbatim !== signal.summary && (
        <p className="text-xs text-content-secondary italic mt-1">“{signal.verbatim}”</p>
      )}

      {/* Insights */}
      {insights && (
        <div className="mt-3 space-y-2 border-t border-border-divider pt-3">
          {insights.planMatch ? (
            <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              <p className="font-bold text-amber-700 dark:text-amber-400">Já existe: {insights.planMatch.feature_name}{insights.planMatch.plan_name ? ` (plano ${insights.planMatch.plan_name})` : ''}</p>
              <p className="text-content-secondary mt-0.5">{insights.planMatch.rationale}</p>
              <Button size="sm" variant="outline" className="mt-2 gap-1 text-[10px]" disabled={busy != null}
                onClick={() => run('avail', () => triageAlreadyAvailable(signal.id, { matchedPlanId: insights.planMatch!.plan_id, matchedFeatureId: insights.planMatch!.feature_id, note: insights.planMatch!.rationale }), 'Marcado como já disponível (upsell)')}>
                <Check className="w-3 h-3" /> Marcar "já temos / upsell"
              </Button>
            </div>
          ) : !insights.catalogConfigured ? (
            <p className="text-[11px] text-content-secondary">Catálogo de planos/funcionalidades vazio — cadastre em <strong>Funcionalidades/Planos</strong> para detectar upsell automaticamente.</p>
          ) : (
            <p className="text-[11px] text-content-secondary">Nenhuma feature existente casou — provável necessidade nova.</p>
          )}

          {insights.matches.items.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Oportunidades semelhantes</p>
              {insights.matches.items.map((it) => (
                <div key={it.item_id} className="flex items-center justify-between gap-2 text-xs border border-border-divider rounded-lg px-2 py-1.5">
                  <span className="truncate">{it.title} <span className="text-content-secondary">· {it.demand_accounts} conta(s)</span></span>
                  <Button size="sm" variant="outline" className="gap-1 text-[10px] shrink-0" disabled={busy != null}
                    onClick={() => run('link', () => promoteToExistingItem(signal.id, it.item_id), 'Vinculado à oportunidade existente')}>
                    <Link2 className="w-3 h-3" /> Agrupar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!insights && (
          <Button size="sm" variant="outline" className="gap-1 text-[10px]" disabled={busy != null}
            onClick={() => run('analyze', async () => { setInsights(await analyzeSignal(signal.id)) })}>
            {busy === 'analyze' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Analisar
          </Button>
        )}
        <div className="flex items-center gap-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 w-48 text-xs" placeholder="Título da oportunidade" />
          <Button size="sm" className="gap-1 text-[10px]" disabled={busy != null}
            onClick={() => run('promote', () => promoteToNewItem(signal.id, { title, opportunity_type: signal.opportunity_type }), 'Promovido a nova oportunidade')}>
            <ArrowUpRight className="w-3 h-3" /> Promover
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-[10px] text-content-secondary" disabled={busy != null}
          onClick={() => run('dup', () => markDuplicate(signal.id, null), 'Marcado como duplicado')}>
          <Copy className="w-3 h-3" /> Duplicado
        </Button>
        <Button size="sm" variant="ghost" className="gap-1 text-[10px] text-content-secondary hover:text-red-500" disabled={busy != null}
          onClick={() => run('dismiss', () => dismissSignal(signal.id, null), 'Descartado')}>
          <X className="w-3 h-3" /> Descartar
        </Button>
      </div>
    </Card>
  )
}
