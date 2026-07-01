'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Loader2, CheckCircle2, XCircle, Plus, Lightbulb, Inbox, Users } from 'lucide-react'
import { promoteClusterToItem, resolveClusterExisting, dismissCluster } from '../actions'

/**
 * Triagem em LOTE (Fase 1 v2): os sinais chegam pré-agrupados por CLUSTER (cron wishlist-enrich),
 * pré-categorizados (área) e pré-casados com o catálogo — o CSM aprova/descarta um GRUPO de uma
 * vez, não sinal a sinal. Grupos com mais contas/pedidos (maior demanda) primeiro.
 */
export function TriageInbox({ signals }: { signals: any[] }) {
  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="w-8 h-8 text-content-secondary/30 mx-auto mb-3" />
          <p className="text-sm font-bold">Triagem zerada</p>
          <p className="text-xs text-content-secondary mt-1">Pedidos identificados pela IA (reuniões, esforço, NPS, suporte) aparecem aqui agrupados para curadoria em lote.</p>
        </CardContent>
      </Card>
    )
  }

  // Agrupa por cluster_key (fallback: o próprio id = singleton).
  const map = new Map<string, any[]>()
  for (const s of signals) {
    const key = s.cluster_key || s.id
    map.set(key, [...(map.get(key) ?? []), s])
  }
  const clusters = [...map.entries()].map(([key, members]) => {
    const names = [...new Set(members.map((m) => m.accounts?.name ?? m.account_id).filter(Boolean))]
    const match = members.find((m) => m.catalog_match)?.catalog_match ?? null
    const area = members.find((m) => m.area)?.area ?? null
    return { key, members, accountNames: names, nAccounts: names.length, match, area, rep: members[0] }
  }).sort((a, b) => (b.members.length - a.members.length) || (b.nAccounts - a.nAccounts))

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {clusters.map((c) => <ClusterCard key={c.key} cluster={c} />)}
      </div>
    </TooltipProvider>
  )
}

function ClusterCard({ cluster }: { cluster: any }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [promoteKind, setPromoteKind] = useState<'new' | 'enhancement' | null>(null)
  const [title, setTitle] = useState(cluster.rep.summary ?? cluster.rep.verbatim?.slice(0, 120) ?? '')
  const act = (fn: () => Promise<any>) => start(async () => { await fn(); router.refresh() })
  const multi = cluster.members.length > 1

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{cluster.rep.summary ?? cluster.rep.verbatim}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-content-secondary">
              {cluster.area && <Badge variant="neutral">{cluster.area}</Badge>}
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {cluster.nAccounts} conta(s)</span>
              {multi && <Badge variant="info">{cluster.members.length} pedidos agrupados</Badge>}
            </div>
          </div>
          {cluster.rep.kind && (
            <Badge variant="outline" className="shrink-0">{cluster.rep.kind === 'enhancement' ? 'Melhoria' : 'Novo'}</Badge>
          )}
        </div>

        {/* Match do catálogo já PRÉ-COMPUTADO pelo cron (sem clique). */}
        {cluster.match && (
          <div className="flex items-start gap-2 text-xs rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Já pode existir: {cluster.match.feature_name}</span>
              {cluster.match.rationale && <p className="text-content-secondary">{cluster.match.rationale}</p>}
            </div>
          </div>
        )}

        {/* Pedidos do grupo (quando multi). */}
        {multi && (
          <details className="text-xs">
            <summary className="cursor-pointer text-content-secondary">
              Ver {cluster.members.length} pedidos · {cluster.accountNames.slice(0, 3).join(', ')}{cluster.accountNames.length > 3 ? '…' : ''}
            </summary>
            <ul className="mt-2 space-y-1 pl-3">
              {cluster.members.map((m: any) => (
                <li key={m.id} className="text-content-secondary leading-snug">
                  • <span className="font-medium text-content-primary">{m.accounts?.name ?? '—'}</span>: “{(m.verbatim ?? m.summary ?? '').toString().slice(0, 140)}”
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Painel de promoção a item. */}
        {promoteKind && (
          <div className="rounded-lg border border-plannera-primary/30 p-3 space-y-2">
            <p className="text-xs font-semibold">
              Criar item {promoteKind === 'enhancement' ? '(melhoria)' : '(novo)'} — agrupa {cluster.members.length} pedido(s) de {cluster.nAccounts} conta(s)
            </p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do item" />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={pending || title.trim().length < 3}
                onClick={() => act(async () => {
                  const id = await promoteClusterToItem(cluster.key, { title, kind: promoteKind, matchedFeatureId: cluster.match?.feature_id ?? null })
                  router.push(`/wishlist/${id}`)
                })}>
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar e abrir
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPromoteKind(null)}>Cancelar</Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Desfechos em LOTE (todo o grupo). */}
        <div className="flex items-center gap-2 flex-wrap">
          {cluster.match && (
            <Tooltip><TooltipTrigger asChild>
              <Button size="sm" variant="outline" disabled={pending}
                onClick={() => act(() => resolveClusterExisting(cluster.key, cluster.match.feature_id, null))}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Já existe
              </Button>
            </TooltipTrigger><TooltipContent>Marca o grupo como resolvido e liga à funcionalidade sugerida. Não cria item.</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPromoteKind('enhancement')}>Melhoria</Button>
          </TooltipTrigger><TooltipContent>Existe mas não atende: cria um item de melhoria com todos os pedidos do grupo.</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setPromoteKind('new')}>Novo item</Button>
          </TooltipTrigger><TooltipContent>Cria um item novo com todos os pedidos do grupo (soma a demanda).</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="text-content-secondary" disabled={pending}
              onClick={() => act(() => dismissCluster(cluster.key, null))}>
              <XCircle className="w-4 h-4" /> Descartar
            </Button>
          </TooltipTrigger><TooltipContent>Descarta todo o grupo (não vira item nem fica pendente).</TooltipContent></Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
