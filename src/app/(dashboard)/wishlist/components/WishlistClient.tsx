'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Inbox, Plus, Settings, Loader2, Users, DollarSign, Layers, ArrowRight } from 'lucide-react'
import { createSignalManual, getSettingsAction, saveSettingsAction } from '../actions'
import { TriageInbox } from './TriageInbox'

const STATUS_LABEL: Record<string, string> = {
  triage: 'Triagem', under_curation: 'Em curadoria', accepted: 'Aceito',
  rejected: 'Recusado', redirected: 'Redirecionado', handed_off: 'Enviado ao produto', delivered: 'Entregue',
}
const STATUS_VARIANT: Record<string, any> = {
  triage: 'neutral', under_curation: 'info', accepted: 'default',
  rejected: 'destructive', redirected: 'secondary', handed_off: 'priority-high', delivered: 'info',
}

export function formatBRL(v: number): string {
  return 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR')
}

export function WishlistClient({
  pendingSignals, items, accounts,
}: {
  pendingSignals: any[]
  items: any[]
  accounts: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [tab, setTab] = useState('triage')

  const totalArr = items
    .filter((i) => ['accepted', 'handed_off', 'under_curation'].includes(i.status))
    .reduce((s, i) => s + Number(i.demand_arr || 0), 0)
  const inCuration = items.filter((i) => i.status === 'under_curation').length
  const accepted = items.filter((i) => ['accepted', 'handed_off', 'delivered'].includes(i.status)).length

  return (
    <div className="space-y-8">
      {/* Como funciona */}
      <div className="rounded-xl border border-plannera-primary/20 bg-plannera-primary/[0.04] px-4 py-3 text-sm text-content-secondary">
        <strong className="text-content-primary">Sinal</strong> = um pedido de <strong>um cliente</strong> (captado por IA em reuniões/esforço/NPS/suporte, ou manual).
        Agrupe sinais semelhantes num <strong className="text-content-primary">Item</strong> (pedido canônico de vários clientes) e encaminhe ao <strong className="text-content-primary">Produto</strong> (avaliação RICE).
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Inbox className="w-4 h-4" />} label="Sinais na triagem" value={String(pendingSignals.length)} />
        <Kpi icon={<Layers className="w-4 h-4" />} label="Em curadoria" value={String(inCuration)} />
        <Kpi icon={<ArrowRight className="w-4 h-4" />} label="Aceitos / enviados" value={String(accepted)} />
        <Kpi icon={<DollarSign className="w-4 h-4" />} label="ARR em jogo (curadoria+)" value={formatBRL(totalArr)} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="triage">Triagem ({pendingSignals.length})</TabsTrigger>
            <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <ManualCaptureDialog accounts={accounts} onDone={() => router.refresh()} />
          <SettingsDialog />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="triage" className="mt-0 space-y-3">
          <p className="text-xs text-content-secondary">Cada sinal é um pedido de um cliente. Decida o desfecho: já existe, vira melhoria, vira item novo, ou descarte.</p>
          <TriageInbox signals={pendingSignals} />
        </TabsContent>

        <TabsContent value="items" className="mt-0 space-y-3">
          <p className="text-xs text-content-secondary">Itens reúnem pedidos semelhantes de vários clientes, <strong>ordenados por RICE</strong> (alcance × impacto × confiança). Clique para curar e encaminhar ao produto.</p>
          {items.length === 0 ? (
            <EmptyState text="Nenhum item ainda. Promova sinais da triagem para criar itens curados." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((it) => (
                <Link key={it.id} href={`/wishlist/${it.id}`}>
                  <Card className="cursor-pointer hover:border-plannera-primary/40 transition-colors h-full">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-snug line-clamp-2">{it.title}</p>
                        <Badge variant={STATUS_VARIANT[it.status] ?? 'neutral'} className="shrink-0">
                          {STATUS_LABEL[it.status] ?? it.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{it.kind === 'enhancement' ? 'Melhoria' : 'Novo'}</Badge>
                        {it.priority && <Badge variant="secondary">{it.priority}</Badge>}
                        {it.category && <Badge variant="neutral">{it.category}</Badge>}
                        {it.rice_score != null && (
                          <Badge variant="default" className="ml-auto" title="Score RICE (alcance × impacto × confiança, sem esforço)">
                            RICE {Number(it.rice_score).toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-content-secondary pt-1">
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {it.demand_accounts} conta(s)</span>
                        <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatBRL(Number(it.demand_arr || 0))}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-plannera-primary pt-1 border-t border-border-divider">
                        Abrir item <ArrowRight className="w-3 h-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {pending && <span className="sr-only">carregando</span>}
    </div>
  )
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-content-secondary text-[11px] font-semibold uppercase tracking-wide">
          {icon}{label}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Inbox className="w-8 h-8 text-content-secondary/30 mx-auto mb-3" />
        <p className="text-sm text-content-secondary max-w-md mx-auto">{text}</p>
      </CardContent>
    </Card>
  )
}

function ManualCaptureDialog({ accounts, onDone }: { accounts: { id: string; name: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [accountId, setAccountId] = useState('')
  const [verbatim, setVerbatim] = useState('')
  const [kind, setKind] = useState('new')
  const [requester, setRequester] = useState('')

  const submit = () => {
    if (!accountId || verbatim.trim().length < 4) return
    start(async () => {
      await createSignalManual({
        accountId,
        verbatim,
        kind: kind === 'none' ? undefined : (kind as any),
        requesterName: requester || undefined,
      })
      setOpen(false); setVerbatim(''); setRequester(''); setAccountId('')
      onDone()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm"><Plus className="w-4 h-4" /> Novo pedido</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pedido manualmente</DialogTitle>
          <DialogDescription>Registre um pedido que surgiu numa conversa; ele entra na Triagem como um sinal manual, pronto para curar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pedido do cliente</Label>
            <Textarea value={verbatim} onChange={(e) => setVerbatim(e.target.value)} rows={3}
              placeholder="O que o cliente pediu, nas palavras dele…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="enhancement">Melhoria</SelectItem>
                  <SelectItem value="none">Não sei ainda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Solicitante (opcional)</Label>
              <Input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nome do contato" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || !accountId || verbatim.trim().length < 4}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [endpoint, setEndpoint] = useState('')
  const [secret, setSecret] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open && !loaded) {
      getSettingsAction().then((s) => {
        setEndpoint(s.handoff_endpoint ?? '')
        setSecret(s.handoff_secret_header ?? '')
        setLoaded(true)
      })
    }
  }, [open, loaded])

  const save = () => {
    start(async () => {
      await saveSettingsAction({ handoff_endpoint: endpoint.trim() || null, handoff_secret_header: secret.trim() || null })
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Settings className="w-4 h-4" /> Configurações</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações de handoff</DialogTitle>
          <DialogDescription>Endpoint (https) que recebe os itens aceitos enviados ao produto. O segredo vai no header X-Wishlist-Secret.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Webhook (https)</Label>
            <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://produto.exemplo.com/webhook/wishlist" />
          </div>
          <div>
            <Label>Segredo (opcional)</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="token compartilhado" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
