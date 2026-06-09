'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Rocket, ChevronDown, ChevronRight, Loader2, Plus, Check, Clock, GanttChartSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Template = { id: string; name: string; project_type: string | null }
type Milestone = {
  id: string
  name: string | null
  stage_key: string | null
  status: string
  planned_date: string | null
  sort_order: number
}
type ContractOb = {
  onboarding_status: string
  onboarding_current_stage: string | null
  onboarding_health: string | null
  onboarding_owner_id?: string | null
} | null
type UserOpt = { id: string; full_name: string | null; email?: string | null }

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Não iniciado', 'in-progress': 'Em andamento', 'on-hold': 'Pausado', 'completed': 'Concluído', 'cancelled': 'Cancelado',
}
const MS_STATUS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
  { value: 'skipped', label: 'Pulado' },
]
const fmt = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '—')

export function OnboardingPanel({ contractId, accountId }: { contractId: string; accountId?: string; contractLabel?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [contract, setContract] = useState<ContractOb>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  // form de início
  const [templateId, setTemplateId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [ownerId, setOwnerId] = useState('')
  const [goLive, setGoLive] = useState('')
  // nota + esforço
  const [note, setNote] = useState('')
  const [effortText, setEffortText] = useState('')
  const [effortBusy, setEffortBusy] = useState(false)
  const [effortMsg, setEffortMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const autoOpenedRef = useRef(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding?contract_id=${contractId}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
      setContract(data.contract ?? null)
      setMilestones(data.milestones ?? [])
      if (!templateId && (data.templates ?? []).length) setTemplateId(data.templates[0].id)
      // Auto-expande (1x) quando ainda não iniciado, p/ o "Iniciar" ficar visível
      if (!autoOpenedRef.current && (data.contract?.onboarding_status ?? 'not-started') === 'not-started') {
        setExpanded(true); autoOpenedRef.current = true
      }
    } finally {
      setLoading(false)
    }
  }, [contractId, templateId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    // responsáveis elegíveis = usuários com permissão de onboarding (perfil)
    fetch('/api/onboarding/owners').then(r => r.ok ? r.json() : []).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const setOwner = async (owner_id: string) => {
    setBusy(true)
    try {
      await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contract_id: contractId, owner_id: owner_id || null }) })
      await load()
    } finally { setBusy(false) }
  }

  const status = contract?.onboarding_status ?? 'not-started'
  const started = status !== 'not-started' && milestones.length > 0
  const done = milestones.filter((m) => m.status === 'done' || m.status === 'skipped').length
  const pct = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0

  const startProject = async () => {
    if (!templateId) return
    setBusy(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, template_id: templateId, start_date: startDate, owner_id: ownerId || undefined, target_go_live: goLive || undefined }),
      })
      await load()
      setExpanded(true)
    } finally { setBusy(false) }
  }

  const setMilestoneStatus = async (m: Milestone, newStatus: string) => {
    setBusy(true)
    try {
      await fetch(`/api/onboarding/milestones/${m.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
      })
      await load()
    } finally { setBusy(false) }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setBusy(true)
    try {
      await fetch('/api/onboarding/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, event_type: 'note', title: note.trim() }),
      })
      setNote(''); await load()
    } finally { setBusy(false) }
  }

  const submitEffort = async () => {
    if (effortText.trim().length < 5) return
    setEffortBusy(true); setEffortMsg(null)
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: effortText.trim(), account_id: accountId, onboarding_contract_id: contractId }),
      })
      const data = await res.json()
      if (!res.ok) { setEffortMsg({ ok: false, text: typeof data?.error === 'string' ? data.error : (data?.hint ?? 'Falha ao registrar esforço.') }); return }
      setEffortText('')
      const psa = data?.psa as { status: string; message: string } | null
      setEffortMsg({ ok: !psa || psa.status !== 'error', text: psa ? `Esforço de ${data.parsed_hours ?? ''}h registrado. PSA: ${psa.message}` : `Esforço de ${data.parsed_hours ?? ''}h registrado.` })
      await load()
    } catch { setEffortMsg({ ok: false, text: 'Falha de rede ao registrar esforço.' }) }
    finally { setEffortBusy(false) }
  }

  const statusBadgeClass =
    status === 'completed' ? 'bg-success/20 text-success'
    : status === 'on-hold' ? 'bg-amber-500/20 text-amber-600'
    : status === 'cancelled' ? 'bg-muted text-content-secondary'
    : status === 'in-progress' ? 'bg-plannera-primary/20 text-plannera-primary'
    : 'bg-muted text-content-secondary'

  const inputCls = 'text-[11px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-primary/30'

  return (
    <div className="mt-4 pt-4 border-t border-border-divider/50">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Rocket className="w-3.5 h-3.5 text-plannera-primary shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Onboarding</span>
          <Badge className={`text-[9px] border-none ${statusBadgeClass}`}>{STATUS_LABEL[status] ?? status}</Badge>
          {started && <span className="text-[9px] text-content-secondary tabular-nums">{done}/{milestones.length} · {pct}%</span>}
        </div>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-content-secondary" /> : expanded ? <ChevronDown className="w-4 h-4 text-content-secondary/50" /> : <ChevronRight className="w-4 h-4 text-content-secondary/50" />}
      </button>

      {started && !expanded && (
        <p className="mt-2 text-[10px] text-content-secondary">Etapa atual: <span className="font-bold text-content-primary">{contract?.onboarding_current_stage ?? '—'}</span></p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          {!started ? (
            <div className="space-y-2">
              <p className="text-[10px] text-content-secondary">Inicie o projeto a partir de um modelo de cronograma:</p>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`w-full ${inputCls}`}>
                {templates.length === 0 && <option value="">Nenhum template</option>}
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1"><span className="text-[9px] text-content-secondary uppercase tracking-widest">Início</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></label>
                <label className="flex flex-col gap-1"><span className="text-[9px] text-content-secondary uppercase tracking-widest">Go-live alvo</span>
                  <input type="date" value={goLive} onChange={(e) => setGoLive(e.target.value)} className={inputCls} /></label>
              </div>
              <label className="flex flex-col gap-1"><span className="text-[9px] text-content-secondary uppercase tracking-widest">Responsável</span>
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                  <option value="">(sem responsável)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>)}
                </select></label>
              <Button size="sm" onClick={startProject} disabled={busy || !templateId}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />} Iniciar projeto
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden flex-1"><div className="h-full bg-plannera-primary transition-all" style={{ width: `${pct}%` }} /></div>
                <Link href={`/onboarding/${contractId}`} className="text-[10px] font-bold text-plannera-primary flex items-center gap-1 shrink-0 hover:underline">
                  <GanttChartSquare className="w-3.5 h-3.5" /> Cronograma
                </Link>
              </div>

              {/* Responsável (implantação) — editável */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary shrink-0">Responsável</span>
                <select value={contract?.onboarding_owner_id ?? ''} disabled={busy} onChange={(e) => setOwner(e.target.value)} className="flex-1 text-[10px] px-2 py-1 rounded-md bg-surface-card border border-border-divider text-content-primary">
                  <option value="">(sem responsável)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>)}
                </select>
              </div>

              {/* Checklist (status + data) */}
              <div className="space-y-1.5">
                {milestones.map((m) => {
                  const isDone = m.status === 'done' || m.status === 'skipped'
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-success/20 text-success' : 'bg-muted text-content-secondary'}`}>{isDone && <Check className="w-2.5 h-2.5" />}</span>
                        <span className={`text-[11px] truncate ${isDone ? 'text-content-secondary line-through' : 'text-content-primary'}`}>{m.name ?? m.stage_key}</span>
                        <span className="text-[9px] text-content-secondary/70 shrink-0">{fmt(m.planned_date)}</span>
                      </div>
                      <select value={m.status} disabled={busy} onChange={(e) => setMilestoneStatus(m, e.target.value)} className="text-[10px] px-1.5 py-1 rounded-md bg-surface-card border border-border-divider text-content-primary shrink-0">
                        {MS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Nota */}
              <div className="flex items-center gap-2 pt-1">
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote() }} placeholder="Registrar nota do onboarding…" className={`flex-1 ${inputCls}`} />
                <Button size="sm" variant="outline" onClick={addNote} disabled={busy || !note.trim()}><Plus className="w-3.5 h-3.5" /></Button>
              </div>

              {/* Esforço de implantação → PSA */}
              <div className="pt-2 border-t border-border-divider/40 space-y-2">
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-plannera-primary" /><span className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Esforço de implantação</span></div>
                <textarea value={effortText} onChange={(e) => setEffortText(e.target.value)} placeholder="Ex.: 2h hoje configurando a instância e treinando o time" rows={2} className={`w-full ${inputCls}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-content-secondary/70">Horas e data são lidas do texto.</span>
                  <Button size="sm" onClick={submitEffort} disabled={effortBusy || effortText.trim().length < 5}>{effortBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Clock className="w-3.5 h-3.5 mr-1" />} Registrar esforço</Button>
                </div>
                {effortMsg && <p className={`text-[10px] ${effortMsg.ok ? 'text-success' : 'text-rose-500'}`}>{effortMsg.text}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
