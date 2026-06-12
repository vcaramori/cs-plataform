'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  Sparkles, Loader2, CheckCircle2, XCircle, GitMerge, Plus, Lightbulb, Link2, Inbox,
} from 'lucide-react'
import {
  analyzeSignal, triageResolvedExisting, dismissSignal, promoteToNewItem, promoteToExistingItem,
  type SignalInsights,
} from '../actions'

const SOURCE_LABEL: Record<string, string> = {
  interaction: 'Reunião', time_entry: 'Esforço', nps_response: 'NPS', support_ticket: 'Suporte', manual: 'Manual',
}

export function TriageInbox({ signals }: { signals: any[] }) {
  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="w-8 h-8 text-content-secondary/30 mx-auto mb-3" />
          <p className="text-sm font-bold">Triagem zerada</p>
          <p className="text-xs text-content-secondary mt-1">Pedidos identificados pela IA (reuniões, esforço, NPS, suporte) aparecem aqui para curadoria.</p>
        </CardContent>
      </Card>
    )
  }

  // agrupa por conta
  const byAccount = new Map<string, any[]>()
  for (const s of signals) {
    const name = s.accounts?.name ?? '—'
    byAccount.set(name, [...(byAccount.get(name) ?? []), s])
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      {Array.from(byAccount.entries()).map(([account, list]) => (
        <div key={account} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-content-secondary">{account} · {list.length}</p>
          <div className="space-y-2">
            {list.map((s) => <SignalCard key={s.id} signal={s} />)}
          </div>
        </div>
      ))}
    </div>
    </TooltipProvider>
  )
}

function SignalCard({ signal }: { signal: any }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [insights, setInsights] = useState<SignalInsights | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [promoteKind, setPromoteKind] = useState<'new' | 'enhancement' | null>(null)
  const [title, setTitle] = useState(signal.summary ?? signal.verbatim?.slice(0, 120) ?? '')

  const analyze = () => {
    setAnalyzing(true)
    analyzeSignal(signal.id)
      .then(setInsights)
      .finally(() => setAnalyzing(false))
  }

  const act = (fn: () => Promise<any>) => start(async () => { await fn(); router.refresh() })

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{signal.summary ?? signal.verbatim}</p>
            {signal.summary && <p className="text-xs text-content-secondary mt-1 line-clamp-2">“{signal.verbatim}”</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="neutral">{SOURCE_LABEL[signal.source_type] ?? signal.source_type}</Badge>
            {signal.kind && <Badge variant="outline">{signal.kind === 'enhancement' ? 'Melhoria' : 'Novo'}</Badge>}
          </div>
        </div>

        {/* Insights da IA */}
        {!insights && (
          <Tooltip><TooltipTrigger asChild>
            <Button variant="secondary" size="sm" onClick={analyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analisar com IA (opcional)
            </Button>
          </TooltipTrigger><TooltipContent>Pergunta à IA se o pedido já existe no catálogo e busca pedidos parecidos de outros clientes.</TooltipContent></Tooltip>
        )}

        {insights && (
          <div className="rounded-lg border border-border-divider bg-surface-background/50 p-3 space-y-3">
            {/* Catálogo */}
            {insights.catalog ? (
              <div className="flex items-start gap-2 text-xs">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Já pode existir: {insights.catalog.feature_name}</span>
                  <p className="text-content-secondary">{insights.catalog.rationale}</p>
                </div>
              </div>
            ) : !insights.catalogConfigured ? (
              <p className="text-xs text-content-secondary">Catálogo de funcionalidades vazio — cadastre em <span className="font-semibold">Funcionalidades</span> para a IA sugerir correspondências.</p>
            ) : (
              <p className="text-xs text-content-secondary">Sem correspondência no catálogo de funcionalidades.</p>
            )}

            {/* Itens semelhantes (cross-customer) */}
            {insights.matches.items.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-content-secondary">Itens semelhantes de outros clientes</p>
                {insights.matches.items.map((it) => (
                  <div key={it.item_id} className="flex items-center justify-between gap-2 text-xs bg-surface-card rounded-md px-2 py-1.5 border border-border-divider">
                    <span className="truncate">{it.title} <span className="text-content-secondary">· {it.demand_accounts} conta(s) · {Math.round(it.similarity * 100)}%</span></span>
                    <Tooltip><TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => act(() => promoteToExistingItem(signal.id, it.item_id, (signal.kind ?? 'new')))}>
                        <Link2 className="w-3.5 h-3.5" /> Vincular
                      </Button>
                    </TooltipTrigger><TooltipContent>Agrupa este sinal ao item existente (soma a demanda).</TooltipContent></Tooltip>
                  </div>
                ))}
              </div>
            )}

            {insights.matches.siblings.length > 0 && (
              <p className="text-[11px] text-content-secondary">
                <GitMerge className="w-3 h-3 inline mr-1" />
                {insights.matches.siblings.length} pedido(s) parecido(s) ainda soltos em outras contas.
              </p>
            )}
          </div>
        )}

        {/* Painel de promoção (novo item) */}
        {promoteKind && (
          <div className="rounded-lg border border-plannera-primary/30 p-3 space-y-2">
            <p className="text-xs font-semibold">Criar item {promoteKind === 'enhancement' ? '(melhoria)' : '(novo)'}</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do item" />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={pending || title.trim().length < 3}
                onClick={() => act(async () => {
                  const id = await promoteToNewItem(signal.id, { title, kind: promoteKind, matchedFeatureId: insights?.catalog?.feature_id ?? null })
                  router.push(`/wishlist/${id}`)
                })}>
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar e abrir
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPromoteKind(null)}>Cancelar</Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Desfechos */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => act(() => triageResolvedExisting(signal.id, insights?.catalog?.feature_id ?? null, null))}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Já existe
            </Button>
          </TooltipTrigger><TooltipContent>Marca como resolvido e liga à funcionalidade do catálogo. Não cria item.</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => { setPromoteKind('enhancement'); }}>
              Existe, insuficiente → melhoria
            </Button>
          </TooltipTrigger><TooltipContent>Existe mas não atende: cria/vincula um item de melhoria.</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => { setPromoteKind('new'); }}>
              Não temos → novo
            </Button>
          </TooltipTrigger><TooltipContent>Cria um item novo (ou vincula a um existente) a partir deste sinal.</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="text-content-secondary" disabled={pending}
              onClick={() => act(() => dismissSignal(signal.id, null))}>
              <XCircle className="w-4 h-4" /> Descartar
            </Button>
          </TooltipTrigger><TooltipContent>Descarta o sinal (não vira item nem fica pendente).</TooltipContent></Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
