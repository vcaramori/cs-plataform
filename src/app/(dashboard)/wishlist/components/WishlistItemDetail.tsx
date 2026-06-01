'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  ArrowLeft, Loader2, Users, DollarSign, CheckCircle2, XCircle, FileText, Send, Unlink, Lightbulb, Clock, Target, X,
} from 'lucide-react'
import {
  updateItem, updateItemRice, setItemStatus, unlinkSignal, buildBriefAction, handoffAction,
} from '../actions'
import { ACTIVITY_TYPES, CRITICALITIES, IMPACT_MIN, IMPACT_MAX, IMPACT_DEFAULT } from '@/lib/wishlist/rice-catalog'
import { formatBRL } from './WishlistClient'

const SOURCE_LABEL: Record<string, string> = {
  interaction: 'Reunião', time_entry: 'Esforço', nps_response: 'NPS', support_ticket: 'Suporte', manual: 'Manual',
}
const STATUS_LABEL: Record<string, string> = {
  triage: 'Triagem', under_curation: 'Em curadoria', accepted: 'Aceito',
  rejected: 'Recusado', redirected: 'Redirecionado', handed_off: 'Enviado ao produto', delivered: 'Entregue',
}
const STATUS_VARIANT: Record<string, any> = {
  triage: 'neutral', under_curation: 'info', accepted: 'default',
  rejected: 'destructive', redirected: 'secondary', handed_off: 'priority-high', delivered: 'info',
}

interface ProductOpt { id: string; name: string; color: string | null; product_epics: { id: string; name: string }[] }

export function WishlistItemDetail({ item, signals, matchedFeature, log, handoffs, products, totalAccounts, suggested }: {
  item: any; signals: any[]; matchedFeature: { id: string; name: string } | null; log: any[]; handoffs: any[]
  products: ProductOpt[]; totalAccounts: number; suggested: { product_id: string | null; epic_id: string | null }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const [title, setTitle] = useState(item.title ?? '')
  const [problem, setProblem] = useState(item.problem ?? '')
  const [outcome, setOutcome] = useState(item.desired_outcome ?? '')
  const [category, setCategory] = useState(item.category ?? '')
  const [kind, setKind] = useState(item.kind ?? 'new')
  const [priority, setPriority] = useState(item.priority ?? 'none')

  // ── RICE ──────────────────────────────────────────────────────────────────
  const [productId, setProductId] = useState<string>(item.product_id ?? suggested.product_id ?? '')
  const [epicId, setEpicId] = useState<string>(item.epic_id ?? suggested.epic_id ?? '')
  const [activityType, setActivityType] = useState<string>(item.activity_type ?? '')
  const [criticality, setCriticality] = useState<string>(item.criticality ?? '')
  const [areas, setAreas] = useState<string[]>(item.areas ?? [])
  const [areaInput, setAreaInput] = useState('')
  const reachDefault = item.reach_pct ?? (totalAccounts > 0 ? Math.round((item.demand_accounts / totalAccounts) * 100) : 0)
  const [reach, setReach] = useState<number>(reachDefault)
  const [impDiff, setImpDiff] = useState<number>(item.impact_differentiation ?? IMPACT_DEFAULT)
  const [impComm, setImpComm] = useState<number>(item.impact_commercial_opportunity ?? IMPACT_DEFAULT)
  const [impSat, setImpSat] = useState<number>(item.impact_satisfaction ?? IMPACT_DEFAULT)
  const [impChurn, setImpChurn] = useState<number>(item.impact_churn_prevention ?? IMPACT_DEFAULT)
  const [commitment, setCommitment] = useState<boolean>(!!item.commercial_commitment)
  const [compTem, setCompTem] = useState<boolean>(!!item.confidence_competitor_has)
  const [wlClients, setWlClients] = useState<boolean>(item.confidence_wishlist_clients ?? true)
  const [wlLeads, setWlLeads] = useState<boolean>(!!item.confidence_wishlist_leads)

  const epicsForProduct = products.find((p) => p.id === productId)?.product_epics ?? []
  const brief = item.product_brief ?? null

  const act = (fn: () => Promise<any>, after?: () => void) =>
    start(async () => { setMsg(null); try { await fn(); after?.(); router.refresh() } catch (e: any) { setMsg(e?.message ?? 'Erro') } })

  const save = () => act(() => updateItem(item.id, {
    title, problem, desired_outcome: outcome, category: category || undefined,
    kind: kind as any, priority: priority === 'none' ? null : (priority as any),
  }))

  const saveRice = () => act(() => updateItemRice(item.id, {
    product_id: productId || null, epic_id: epicId || null,
    activity_type: activityType || null, criticality: criticality || null,
    areas, reach_pct: reach,
    impact_differentiation: impDiff, impact_commercial_opportunity: impComm,
    impact_satisfaction: impSat, impact_churn_prevention: impChurn,
    commercial_commitment: commitment,
    confidence_competitor_has: compTem, confidence_wishlist_clients: wlClients, confidence_wishlist_leads: wlLeads,
  }), () => setMsg('Avaliação de produto salva.'))

  const addArea = () => {
    const a = areaInput.trim()
    if (a && !areas.includes(a)) setAreas([...areas, a])
    setAreaInput('')
  }

  const doHandoff = (mode: 'export' | 'webhook') => start(async () => {
    setMsg(null)
    try {
      const r = await handoffAction(item.id, mode)
      setMsg(r.ok ? (mode === 'export' ? 'Pacote gerado e registrado.' : 'Enviado ao produto com sucesso.') : `Falha: ${r.error ?? r.status_code}`)
      router.refresh()
    } catch (e: any) { setMsg(e?.message ?? 'Erro no handoff') }
  })

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      <Link href="/wishlist" className="inline-flex items-center gap-1 text-sm text-content-secondary hover:text-content-primary">
        <ArrowLeft className="w-4 h-4" /> Voltar para Wishlist
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="h1-page">{item.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[item.status] ?? 'neutral'}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
            <Badge variant="outline">{item.kind === 'enhancement' ? 'Melhoria' : 'Novo'}</Badge>
            {item.priority && <Badge variant="secondary">{item.priority}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['triage', 'under_curation'].includes(item.status) && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'accepted'))}>
                  <CheckCircle2 className="w-4 h-4" /> Aceitar
                </Button>
              </TooltipTrigger><TooltipContent>Aprova o item para encaminhar ao produto.</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'redirected'))}>Redirecionar</Button>
              </TooltipTrigger><TooltipContent>Resolvido por uma funcionalidade existente.</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="text-content-secondary" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'rejected'))}>
                  <XCircle className="w-4 h-4" /> Recusar
                </Button>
              </TooltipTrigger><TooltipContent>Fora de escopo / não será levado ao produto.</TooltipContent></Tooltip>
            </>
          )}
          {['accepted', 'handed_off'].includes(item.status) && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => doHandoff('export')}>
                  <FileText className="w-4 h-4" /> Exportar pacote (JSON)
                </Button>
              </TooltipTrigger><TooltipContent>Gera e registra o pacote RICE para copiar/baixar — não envia.</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button size="sm" disabled={pending} onClick={() => doHandoff('webhook')}>
                  <Send className="w-4 h-4" /> Enviar via webhook
                </Button>
              </TooltipTrigger><TooltipContent>Faz POST do pacote RICE para o endpoint configurado em Configurações.</TooltipContent></Tooltip>
            </>
          )}
        </div>
      </div>

      {msg && <div className="text-sm rounded-lg border border-border-divider bg-surface-card px-3 py-2">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Edição */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Problema</Label>
              <Textarea rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Qual dor do cliente este pedido resolve?" />
            </div>
            <div>
              <Label>Resultado desejado</Label>
              <Textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="O que muda para o cliente quando isso existir?" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo do pedido</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="enhancement">Melhoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ex.: Relatórios" />
              </div>
            </div>
            <div>
              <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Demanda + meta */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-content-secondary">Demanda</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold inline-flex items-center gap-1"><Users className="w-5 h-5" /> {item.demand_accounts}</p>
                <p className="text-[11px] text-content-secondary">contas</p>
              </div>
              <Tooltip><TooltipTrigger asChild>
                <div>
                  <p className="text-2xl font-bold inline-flex items-center gap-1"><DollarSign className="w-5 h-5" /> {formatBRL(Number(item.demand_arr || 0))}</p>
                  <p className="text-[11px] text-content-secondary">ARR em jogo</p>
                </div>
              </TooltipTrigger><TooltipContent>Soma do ARR (contratos ativos) das contas com sinais vinculados.</TooltipContent></Tooltip>
            </div>
            {matchedFeature && (
              <div className="text-xs flex items-start gap-2 pt-1">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Relacionado a <strong>{matchedFeature.name}</strong></span>
              </div>
            )}
            {handoffs.length > 0 && (
              <>
                <Separator />
                <p className="text-[11px] font-bold uppercase tracking-wide text-content-secondary">Envios</p>
                <div className="space-y-1">
                  {handoffs.map((h) => (
                    <div key={h.id} className="text-xs flex items-center justify-between">
                      <span>{h.target === 'webhook' ? 'Webhook' : 'Pacote'} · {(h.created_at ?? '').slice(0, 10)}</span>
                      <Badge variant={h.status === 'sent' ? 'default' : h.status === 'failed' ? 'destructive' : 'neutral'}>{h.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Avaliação de produto (RICE) ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-plannera-primary" />
            <p className="text-sm font-bold">Avaliação de produto (RICE)</p>
          </div>
          <p className="text-xs text-content-secondary -mt-2">Estes campos compõem o pacote enviado à ferramenta de produto. Produto e Épico vêm do de→para da funcionalidade, quando houver.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Produto / Squad</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setEpicId('') }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Épico</Label>
              <Select value={epicId} onValueChange={setEpicId} disabled={!productId}>
                <SelectTrigger><SelectValue placeholder={productId ? 'Selecione' : 'Escolha o produto'} /></SelectTrigger>
                <SelectContent>{epicsForProduct.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criticidade</Label>
              <Select value={criticality} onValueChange={setCriticality}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CRITICALITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Áreas solicitantes</Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {areas.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-surface-background border border-border-divider rounded-full px-2 py-0.5">
                    {a}<button onClick={() => setAreas(areas.filter((x) => x !== a))} className="text-content-secondary/40 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <Input value={areaInput} onChange={(e) => setAreaInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArea() } }} placeholder="Digite e Enter (ex.: PCP, Suprimentos)" />
            </div>
          </div>

          {/* Clientes (leitura) */}
          <div>
            <Label>Clientes solicitantes ({item.demand_accounts})</Label>
            <p className="text-xs text-content-secondary">Derivado das contas com sinais vinculados — enviado automaticamente no pacote.</p>
          </div>

          <Separator />

          {/* R — Alcance */}
          <div>
            <Label>R — Alcance: {reach}% de clientes impactados</Label>
            <input type="range" min={0} max={100} value={reach} onChange={(e) => setReach(Number(e.target.value))} className="w-full accent-plannera-primary" />
          </div>

          {/* I — Impacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {([['Diferencial / Fidelização', impDiff, setImpDiff], ['Oportunidade comercial', impComm, setImpComm], ['Satisfação do cliente', impSat, setImpSat], ['Evita churn', impChurn, setImpChurn]] as const).map(([label, val, setter]) => (
              <div key={label}>
                <Label>I — {label}: {val}</Label>
                <input type="range" min={IMPACT_MIN} max={IMPACT_MAX} value={val as number} onChange={(e) => (setter as any)(Number(e.target.value))} className="w-full accent-plannera-primary" />
              </div>
            ))}
            <label className="inline-flex items-center gap-2 text-sm mt-1"><Switch checked={commitment} onCheckedChange={setCommitment} /> Compromisso comercial</label>
          </div>

          <Separator />

          {/* C — Confiança */}
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-xs font-bold uppercase tracking-wide text-content-secondary">C — Confiança</span>
            <label className="inline-flex items-center gap-2 text-sm"><Switch checked={compTem} onCheckedChange={setCompTem} /> Concorrente tem?</label>
            <label className="inline-flex items-center gap-2 text-sm"><Switch checked={wlClients} onCheckedChange={setWlClients} /> Wishlist clientes?</label>
            <label className="inline-flex items-center gap-2 text-sm"><Switch checked={wlLeads} onCheckedChange={setWlLeads} /> Wishlist leads?</label>
          </div>

          <p className="text-[11px] text-content-secondary italic">Protótipo, detalhamento técnico e esforço são preenchidos pelo gestor RICE.</p>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveRice} disabled={pending}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar avaliação</Button>
            <Tooltip><TooltipTrigger asChild>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => buildBriefAction(item.id), () => setMsg('Brief de produto gerado.'))}>
                <FileText className="w-4 h-4" /> Gerar brief de produto
              </Button>
            </TooltipTrigger><TooltipContent>Monta o resumo (problema, demanda, ARR, evidências) que será enviado.</TooltipContent></Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Microtexto do fluxo de handoff */}
      <p className="text-xs text-content-secondary">Fluxo de handoff: <strong>1)</strong> gere o brief → <strong>2)</strong> exporte o pacote ou envie por webhook (item precisa estar <em>Aceito</em>).</p>

      {/* Brief gerado */}
      {brief?.narrative && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-content-secondary">Brief de produto</p>
            <p className="text-sm whitespace-pre-line">{brief.narrative}</p>
          </CardContent>
        </Card>
      )}

      {/* Evidências */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-content-secondary">Evidências ({signals.length})</p>
          {signals.length === 0 && <p className="text-sm text-content-secondary">Nenhum sinal vinculado.</p>}
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 border border-border-divider rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="neutral">{s.accounts?.name ?? '—'}</Badge>
                    <Badge variant="outline">{SOURCE_LABEL[s.source_type] ?? s.source_type}</Badge>
                    <span className="text-[11px] text-content-secondary">{(s.created_at ?? '').slice(0, 10)}</span>
                  </div>
                  <p className="text-sm">{s.summary ?? s.verbatim}</p>
                </div>
                <Tooltip><TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="shrink-0 gap-1" disabled={pending} onClick={() => act(() => unlinkSignal(s.id, item.id))}>
                    <Unlink className="w-4 h-4" /> Desvincular
                  </Button>
                </TooltipTrigger><TooltipContent>Remove este sinal do item e recalcula a demanda.</TooltipContent></Tooltip>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de curadoria */}
      {log.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-content-secondary">Histórico</p>
            <div className="space-y-1">
              {log.map((l) => (
                <div key={l.id} className="text-xs text-content-secondary flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{(l.created_at ?? '').slice(0, 16).replace('T', ' ')}</span>
                  <span className="text-content-primary font-medium">{l.action}</span>
                  {l.to_status && <span>→ {STATUS_LABEL[l.to_status] ?? l.to_status}</span>}
                  {l.note && <span>· {l.note}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  )
}
