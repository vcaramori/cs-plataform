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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  ArrowLeft, Loader2, Users, DollarSign, CheckCircle2, XCircle, Share2, FileText, Send, Unlink, Lightbulb, Clock,
} from 'lucide-react'
import {
  updateItem, setItemStatus, unlinkSignal, buildBriefAction, handoffAction,
} from '../actions'
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

export function WishlistItemDetail({ item, signals, matchedFeature, log, handoffs }: {
  item: any; signals: any[]; matchedFeature: { id: string; name: string } | null; log: any[]; handoffs: any[]
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

  const brief = item.product_brief ?? null

  const act = (fn: () => Promise<any>, after?: () => void) =>
    start(async () => { setMsg(null); try { await fn(); after?.(); router.refresh() } catch (e: any) { setMsg(e?.message ?? 'Erro') } })

  const save = () => act(() => updateItem(item.id, {
    title, problem, desired_outcome: outcome, category: category || undefined,
    kind: kind as any, priority: priority === 'none' ? null : (priority as any),
  }))

  const doHandoff = (mode: 'export' | 'webhook') => start(async () => {
    setMsg(null)
    try {
      const r = await handoffAction(item.id, mode)
      setMsg(r.ok ? (mode === 'export' ? 'Pacote gerado e registrado.' : 'Enviado ao produto com sucesso.') : `Falha: ${r.error ?? r.status_code}`)
      router.refresh()
    } catch (e: any) { setMsg(e?.message ?? 'Erro no handoff') }
  })

  return (
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
              <Button size="sm" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'accepted'))}>
                <CheckCircle2 className="w-4 h-4" /> Aceitar
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'redirected'))}>
                Redirecionar
              </Button>
              <Button size="sm" variant="ghost" className="text-content-secondary" disabled={pending} onClick={() => act(() => setItemStatus(item.id, 'rejected'))}>
                <XCircle className="w-4 h-4" /> Recusar
              </Button>
            </>
          )}
          {['accepted', 'handed_off'].includes(item.status) && (
            <>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => doHandoff('export')}>
                <FileText className="w-4 h-4" /> Gerar pacote
              </Button>
              <Button size="sm" disabled={pending} onClick={() => doHandoff('webhook')}>
                <Send className="w-4 h-4" /> Enviar ao produto
              </Button>
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
                <Label>Tipo</Label>
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
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} disabled={pending}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar</Button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => buildBriefAction(item.id), () => setMsg('Brief de produto gerado.'))}>
                <Share2 className="w-4 h-4" /> Gerar brief
              </Button>
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
              <div>
                <p className="text-2xl font-bold inline-flex items-center gap-1"><DollarSign className="w-5 h-5" /> {formatBRL(Number(item.demand_arr || 0))}</p>
                <p className="text-[11px] text-content-secondary">ARR em jogo</p>
              </div>
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
                <Button size="sm" variant="ghost" className="shrink-0" disabled={pending}
                  onClick={() => act(() => unlinkSignal(s.id, item.id))}>
                  <Unlink className="w-4 h-4" />
                </Button>
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
  )
}
