'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, Send, FileText, Unlink, DollarSign, Users } from 'lucide-react'
import { toast } from 'sonner'
import { updateItem, setItemStatus, unlinkSignal, buildBriefAction, markAsSentAction } from '../actions'
import { OPP_TYPE_LABELS, STATUS_LABELS, SOURCE_LABELS, type OppTypeKey, type OppStatusKey } from './labels'

const brl = (n: number) => `R$ ${Math.round(n || 0).toLocaleString('pt-BR')}`
const STATUS_FLOW: OppStatusKey[] = ['triage', 'under_curation', 'qualified', 'ready_to_send', 'sent', 'won', 'lost', 'discarded']

export function OpportunityItemDetail({ item, signals, log, handoffs }: {
  item: any; signals: any[]; log: any[]; handoffs: any[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: item.title ?? '',
    need: item.need ?? '',
    desired_outcome: item.desired_outcome ?? '',
    category: item.category ?? '',
    opportunity_type: (item.opportunity_type ?? 'other') as OppTypeKey,
    priority: item.priority ?? '',
    estimated_value: item.estimated_value ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<any>, okMsg?: string) => {
    setBusy(key)
    try { await fn(); if (okMsg) toast.success(okMsg); router.refresh() }
    catch (e: any) { toast.error(e?.message ?? 'Falha') }
    finally { setBusy(null) }
  }

  async function save() {
    setSaving(true)
    try {
      await updateItem(item.id, {
        title: form.title,
        need: form.need,
        desired_outcome: form.desired_outcome,
        category: form.category || undefined,
        opportunity_type: form.opportunity_type,
        priority: (form.priority || null) as any,
        estimated_value: form.estimated_value === '' ? null : Number(form.estimated_value),
      })
      toast.success('Oportunidade atualizada')
      router.refresh()
    } catch (e: any) { toast.error(e?.message ?? 'Falha ao salvar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/oportunidades" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-content-secondary hover:text-content-primary">
          <ArrowLeft className="w-4 h-4" /> Oportunidades
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="text-[10px] uppercase border-none bg-muted text-content-secondary">{STATUS_LABELS[item.status as OppStatusKey] ?? item.status}</Badge>
          <Select value={item.status} onValueChange={(v) => run('status', () => setItemStatus(item.id, v as OppStatusKey), 'Status atualizado')}>
            <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="Mudar status" /></SelectTrigger>
            <SelectContent>
              {STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Edição */}
        <div className="lg:col-span-2 space-y-4">
          <Card><CardContent className="p-5 space-y-3">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.opportunity_type} onValueChange={(v) => setForm((f) => ({ ...f, opportunity_type: v as OppTypeKey }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(OPP_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.priority || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, priority: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Necessidade / problema</Label>
              <Textarea rows={3} value={form.need} onChange={(e) => setForm((f) => ({ ...f, need: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Resultado desejado</Label>
              <Textarea rows={2} value={form.desired_outcome} onChange={(e) => setForm((f) => ({ ...f, desired_outcome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Valor estimado (R$)</Label>
                <Input type="number" value={form.estimated_value} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar</Button>
            </div>
          </CardContent></Card>

          {/* Evidências */}
          <Card><CardContent className="p-5 space-y-2">
            <p className="font-bold text-sm">Evidências ({signals.length})</p>
            {signals.length === 0 ? <p className="text-xs text-content-secondary">Nenhum sinal vinculado.</p> : signals.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-2 border border-border-divider rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] uppercase">{s.accounts?.name ?? '—'}</Badge>
                    <Badge variant="outline" className="text-[9px] uppercase text-content-secondary">{SOURCE_LABELS[s.source_type] ?? s.source_type}</Badge>
                  </div>
                  <p className="text-xs text-content-primary mt-1">{s.summary}</p>
                  {s.verbatim && s.verbatim !== s.summary && <p className="text-[11px] text-content-secondary italic mt-0.5">“{s.verbatim}”</p>}
                </div>
                <button onClick={() => run('unlink', () => unlinkSignal(s.id, item.id), 'Sinal desvinculado')} disabled={busy != null} className="text-content-secondary hover:text-red-500 p-1 shrink-0" aria-label="Desvincular">
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </CardContent></Card>

          {/* Log */}
          {log.length > 0 && (
            <Card><CardContent className="p-5 space-y-1.5">
              <p className="font-bold text-sm">Histórico de curadoria</p>
              {log.map((l) => (
                <div key={l.id} className="text-[11px] text-content-secondary flex items-center gap-2">
                  <span className="font-mono">{(l.created_at ?? '').slice(0, 10)}</span>
                  <span className="font-bold uppercase tracking-wide">{l.action}</span>
                  {l.to_status && <span>→ {l.to_status}</span>}
                  {l.note && <span className="italic">· {l.note}</span>}
                </div>
              ))}
            </CardContent></Card>
          )}
        </div>

        {/* Demanda + Pipedrive */}
        <div className="space-y-4">
          <Card><CardContent className="p-5 space-y-2">
            <p className="font-bold text-sm">Demanda</p>
            <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-content-secondary" /> {item.demand_accounts} conta(s)</div>
            <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-content-secondary" /> {brl(Number(item.demand_arr))} ARR</div>
            {item.estimated_value != null && <div className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">Valor estimado: {brl(Number(item.estimated_value))}</div>}
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-3">
            <p className="font-bold text-sm">Pipedrive</p>
            <p className="text-xs text-content-secondary">Prepare o brief comercial e marque como enviado quando criar o deal no Pipedrive (envio manual nesta fase).</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="gap-2" disabled={busy != null}
                onClick={() => run('brief', () => buildBriefAction(item.id), 'Brief comercial gerado')}>
                {busy === 'brief' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Gerar brief
              </Button>
              <Button className="gap-2" disabled={busy != null || item.status === 'sent'}
                onClick={() => run('sent', () => markAsSentAction(item.id), 'Marcado como enviado ao Pipedrive')}>
                {busy === 'sent' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {item.status === 'sent' ? 'Já enviado' : 'Marcar como enviado'}
              </Button>
            </div>
            {item.commercial_brief?.narrative && (
              <div className="text-[11px] text-content-secondary border-t border-border-divider pt-2 mt-1">
                <p className="font-bold uppercase tracking-widest mb-1">Resumo</p>
                <p>{item.commercial_brief.narrative}</p>
              </div>
            )}
            {handoffs.length > 0 && (
              <div className="border-t border-border-divider pt-2 mt-1 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Envios</p>
                {handoffs.map((h) => (
                  <div key={h.id} className="text-[11px] text-content-secondary flex items-center gap-2">
                    <span className="font-mono">{(h.created_at ?? '').slice(0, 10)}</span>
                    <Badge variant="outline" className="text-[9px] uppercase">{h.target}</Badge>
                    <span>{h.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </div>
      </div>
    </div>
  )
}
