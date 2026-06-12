'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Inbox, Layers, Loader2, Plus, TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { OpportunityTriageInbox } from './OpportunityTriageInbox'
import { createSignalManual } from '../actions'
import { OPP_TYPE_LABELS, STATUS_LABELS, type OppTypeKey, type OppStatusKey } from './labels'

type Account = { id: string; name: string }
type SignalRow = {
  id: string; account_id: string; source_type: string; verbatim: string; summary: string | null
  opportunity_type: OppTypeKey; ai_confidence: number | null; requester_name: string | null
  created_at: string; accounts: { name: string } | null
}
type ItemRow = {
  id: string; title: string; opportunity_type: OppTypeKey; status: OppStatusKey; priority: string | null
  category: string | null; demand_accounts: number; demand_arr: number; estimated_value: number | null; updated_at: string
}

const brl = (n: number) => `R$ ${Math.round(n || 0).toLocaleString('pt-BR')}`

export function OpportunitiesClient({ pendingSignals, items, accounts }: {
  pendingSignals: SignalRow[]; items: ItemRow[]; accounts: Account[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'triage' | 'items'>('triage')

  const inCuration = items.filter((i) => ['under_curation', 'qualified', 'ready_to_send'].includes(i.status)).length
  const sent = items.filter((i) => i.status === 'sent').length
  const totalArr = items.reduce((s, i) => s + Number(i.demand_arr || 0), 0)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Inbox className="w-4 h-4" />} label="Na triagem" value={pendingSignals.length} />
        <Kpi icon={<Layers className="w-4 h-4" />} label="Em curadoria" value={inCuration} />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Enviadas" value={sent} />
        <Kpi icon={<DollarSign className="w-4 h-4" />} label="ARR em demanda" value={brl(totalArr)} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl border border-border-divider overflow-hidden">
          <button onClick={() => setTab('triage')} className={tabCls(tab === 'triage')}>Triagem ({pendingSignals.length})</button>
          <button onClick={() => setTab('items')} className={tabCls(tab === 'items')}>Oportunidades ({items.length})</button>
        </div>
        <ManualCaptureDialog accounts={accounts} onCreated={() => router.refresh()} />
      </div>

      {tab === 'triage' ? (
        <OpportunityTriageInbox pendingSignals={pendingSignals} />
      ) : (
        items.length === 0 ? (
          <Card className="p-10 text-center"><p className="text-sm text-content-secondary">Nenhuma oportunidade ainda. Trie sinais para promovê-los.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => (
              <Link key={it.id} href={`/oportunidades/${it.id}`}>
                <Card className="p-4 h-full hover:shadow-md transition-all border-border-divider">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px] uppercase">{OPP_TYPE_LABELS[it.opportunity_type] ?? it.opportunity_type}</Badge>
                    <Badge className="text-[9px] uppercase border-none bg-muted text-content-secondary">{STATUS_LABELS[it.status] ?? it.status}</Badge>
                  </div>
                  <p className="font-bold text-sm text-content-primary line-clamp-2">{it.title}</p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-content-secondary">
                    <span>{it.demand_accounts} conta(s)</span>
                    <span>{brl(Number(it.demand_arr))} ARR</span>
                    {it.estimated_value ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">~{brl(Number(it.estimated_value))}</span> : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function tabCls(active: boolean) {
  return `px-4 h-9 text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-content-secondary hover:text-content-primary'}`
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4 border-border-divider">
      <div className="flex items-center gap-2 text-content-secondary text-[10px] font-black uppercase tracking-widest">{icon}{label}</div>
      <p className="text-2xl font-black text-content-primary mt-1">{value}</p>
    </Card>
  )
}

function ManualCaptureDialog({ accounts, onCreated }: { accounts: Account[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [verbatim, setVerbatim] = useState('')
  const [summary, setSummary] = useState('')
  const [type, setType] = useState<OppTypeKey>('other')
  const [requester, setRequester] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!accountId) { toast.error('Selecione a conta'); return }
    if (verbatim.trim().length < 5) { toast.error('Descreva a oportunidade'); return }
    setSaving(true)
    try {
      await createSignalManual({ accountId, verbatim, summary, opportunity_type: type, requesterName: requester })
      toast.success('Oportunidade capturada')
      setOpen(false); setAccountId(''); setVerbatim(''); setSummary(''); setType('other'); setRequester('')
      onCreated()
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao capturar')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Captura manual</Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 max-w-lg rounded-2xl">
        <DialogTitle className="text-base font-black uppercase tracking-tighter">Capturar oportunidade</DialogTitle>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Conta</Label>
            <SearchableSelect value={accountId} onValueChange={setAccountId} options={accounts.map((a) => ({ label: a.name, value: a.id }))} />
          </div>
          <div>
            <Label className="text-xs">Citação do cliente (verbatim)</Label>
            <Textarea rows={3} value={verbatim} onChange={(e) => setVerbatim(e.target.value)} placeholder="Ex.: 'Precisamos de um módulo de DRP para distribuir a demanda por região'" />
          </div>
          <div>
            <Label className="text-xs">Resumo (opcional)</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo objetivo da oportunidade" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as OppTypeKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OPP_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Solicitante (opcional)</Label>
              <Input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nome do contato" />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={submit} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
