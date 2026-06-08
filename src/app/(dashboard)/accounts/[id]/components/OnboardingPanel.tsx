'use client'

import { useCallback, useEffect, useState } from 'react'
import { Rocket, ChevronDown, ChevronRight, Loader2, Plus, Check, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Stage = { key: string; label: string; sort_order: number }
type Milestone = {
  id: string
  stage_key: string
  status: string
  planned_date: string | null
  completed_date: string | null
  sort_order: number
}
type ContractOb = {
  onboarding_status: string
  onboarding_current_stage: string | null
  onboarding_health: string | null
} | null

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Não iniciado',
  'in-progress': 'Em andamento',
  'on-hold': 'Pausado',
  'completed': 'Concluído',
  'cancelled': 'Cancelado',
}
const MS_STATUS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
  { value: 'skipped', label: 'Pulado' },
]

export function OnboardingPanel({ contractId, accountId }: { contractId: string; accountId?: string; contractLabel?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [stages, setStages] = useState<Stage[]>([])
  const [contract, setContract] = useState<ContractOb>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [note, setNote] = useState('')
  const [effortText, setEffortText] = useState('')
  const [effortBusy, setEffortBusy] = useState(false)
  const [effortMsg, setEffortMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding?contract_id=${contractId}`)
      const data = await res.json()
      setStages(data.stages ?? [])
      setContract(data.contract ?? null)
      setMilestones(data.milestones ?? [])
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => { load() }, [load])

  const stageLabel = useCallback(
    (key: string | null) => (key ? (stages.find((s) => s.key === key)?.label ?? key) : '—'),
    [stages]
  )

  const status = contract?.onboarding_status ?? 'not-started'
  const started = status !== 'not-started' && milestones.length > 0
  const done = milestones.filter((m) => m.status === 'done' || m.status === 'skipped').length
  const pct = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0

  const startOnboarding = async () => {
    setBusy(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      })
      await load()
      setExpanded(true)
    } finally {
      setBusy(false)
    }
  }

  const setMilestoneStatus = async (m: Milestone, newStatus: string) => {
    setBusy(true)
    try {
      await fetch(`/api/onboarding/milestones/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setBusy(true)
    try {
      await fetch('/api/onboarding/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, event_type: 'note', title: note.trim() }),
      })
      setNote('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  // Esforço de implantação: herda o parse IA do esforço e aponta as horas no PSA.
  const submitEffort = async () => {
    if (effortText.trim().length < 5) return
    setEffortBusy(true)
    setEffortMsg(null)
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: effortText.trim(),
          account_id: accountId,
          onboarding_contract_id: contractId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : (data?.hint ?? 'Falha ao registrar esforço.')
        setEffortMsg({ ok: false, text: msg })
        return
      }
      setEffortText('')
      const psa = data?.psa as { status: string; message: string } | null
      const base = `Esforço de ${data.parsed_hours ?? ''}h registrado.`
      setEffortMsg({
        ok: !psa || psa.status !== 'error',
        text: psa ? `${base} PSA: ${psa.message}` : base,
      })
      await load()
    } catch {
      setEffortMsg({ ok: false, text: 'Falha de rede ao registrar esforço.' })
    } finally {
      setEffortBusy(false)
    }
  }

  const statusBadgeClass =
    status === 'completed' ? 'bg-success/20 text-success'
    : status === 'on-hold' ? 'bg-amber-500/20 text-amber-600'
    : status === 'cancelled' ? 'bg-muted text-content-secondary'
    : status === 'in-progress' ? 'bg-plannera-primary/20 text-plannera-primary'
    : 'bg-muted text-content-secondary'

  return (
    <div className="mt-4 pt-4 border-t border-border-divider/50">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Rocket className="w-3.5 h-3.5 text-plannera-primary shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Onboarding</span>
          <Badge className={`text-[9px] border-none ${statusBadgeClass}`}>{STATUS_LABEL[status] ?? status}</Badge>
          {started && (
            <span className="text-[9px] text-content-secondary tabular-nums">{done}/{milestones.length} · {pct}%</span>
          )}
        </div>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-content-secondary" /> : expanded ? <ChevronDown className="w-4 h-4 text-content-secondary/50" /> : <ChevronRight className="w-4 h-4 text-content-secondary/50" />}
      </button>

      {started && !expanded && (
        <p className="mt-2 text-[10px] text-content-secondary">
          Etapa atual: <span className="font-bold text-content-primary">{stageLabel(contract?.onboarding_current_stage ?? null)}</span>
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          {!started ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-[10px] text-content-secondary">Este contrato ainda não está em onboarding.</p>
              <Button size="sm" onClick={startOnboarding} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Iniciar onboarding
              </Button>
            </div>
          ) : (
            <>
              {/* Barra de progresso */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-plannera-primary transition-all" style={{ width: `${pct}%` }} />
              </div>

              {/* Checklist */}
              <div className="space-y-1.5">
                {milestones.map((m) => {
                  const isDone = m.status === 'done' || m.status === 'skipped'
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-success/20 text-success' : 'bg-muted text-content-secondary'}`}>
                          {isDone && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className={`text-[11px] truncate ${isDone ? 'text-content-secondary line-through' : 'text-content-primary'}`}>
                          {stageLabel(m.stage_key)}
                        </span>
                      </div>
                      <select
                        value={m.status}
                        disabled={busy}
                        onChange={(e) => setMilestoneStatus(m, e.target.value)}
                        className="text-[10px] px-1.5 py-1 rounded-md bg-surface-card border border-border-divider text-content-primary shrink-0"
                      >
                        {MS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Adicionar nota ao diário (alimenta o RAG) */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
                  placeholder="Registrar nota do onboarding…"
                  className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary placeholder:text-content-secondary/50 focus:outline-none focus:ring-1 focus:ring-plannera-primary/30"
                />
                <Button size="sm" variant="outline" onClick={addNote} disabled={busy || !note.trim()}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Esforço de implantação → apontamento de horas no PSA */}
              <div className="pt-2 border-t border-border-divider/40 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-plannera-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Esforço de implantação</span>
                </div>
                <textarea
                  value={effortText}
                  onChange={(e) => setEffortText(e.target.value)}
                  placeholder="Ex.: 2h hoje configurando a instância e treinando o time"
                  rows={2}
                  className="w-full text-[11px] px-2.5 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary placeholder:text-content-secondary/50 focus:outline-none focus:ring-1 focus:ring-plannera-primary/30"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-content-secondary/70">Horas e data são lidas do texto (ex.: "ontem", "3h").</span>
                  <Button size="sm" onClick={submitEffort} disabled={effortBusy || effortText.trim().length < 5}>
                    {effortBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                    Registrar esforço
                  </Button>
                </div>
                {effortMsg && (
                  <p className={`text-[10px] ${effortMsg.ok ? 'text-success' : 'text-rose-500'}`}>{effortMsg.text}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
