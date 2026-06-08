'use client'

import { useCallback, useEffect, useState } from 'react'
import { Handshake, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Negotiation = {
  id: string
  negotiation_type: string
  date: string
  discount_offered_pct: number | null
  discount_accepted_pct: number | null
  main_objection: string | null
  closing_argument: string | null
  counterpart_name: string | null
  counterpart_role: string | null
  outcome: string | null
  notes: string | null
}

const TYPE_LABEL: Record<string, string> = { initial: 'Venda inicial', renewal: 'Renovação', renegotiation: 'Renegociação' }
const OUTCOME_LABEL: Record<string, string> = { won: 'Fechado', renewed: 'Renovado', lost: 'Perdido', pending: 'Em aberto' }
const OUTCOME_CLASS: Record<string, string> = {
  won: 'bg-success/20 text-success',
  renewed: 'bg-success/20 text-success',
  lost: 'bg-rose-500/20 text-rose-500',
  pending: 'bg-amber-500/20 text-amber-600',
}

const EMPTY = {
  negotiation_type: 'renewal',
  outcome: 'pending',
  discount_offered_pct: '',
  discount_accepted_pct: '',
  main_objection: '',
  closing_argument: '',
  counterpart_name: '',
  notes: '',
}

export function NegotiationPanel({ contractId }: { contractId: string; accountId?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Negotiation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/negotiation?contract_id=${contractId}`)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    setBusy(true)
    try {
      await fetch('/api/contracts/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          negotiation_type: form.negotiation_type,
          outcome: form.outcome,
          discount_offered_pct: form.discount_offered_pct === '' ? undefined : Number(form.discount_offered_pct),
          discount_accepted_pct: form.discount_accepted_pct === '' ? undefined : Number(form.discount_accepted_pct),
          main_objection: form.main_objection || undefined,
          closing_argument: form.closing_argument || undefined,
          counterpart_name: form.counterpart_name || undefined,
          notes: form.notes || undefined,
        }),
      })
      setForm({ ...EMPTY })
      setShowForm(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full text-[11px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary placeholder:text-content-secondary/50 focus:outline-none focus:ring-1 focus:ring-plannera-primary/30'

  return (
    <div className="mt-3 pt-3 border-t border-border-divider/50">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Handshake className="w-3.5 h-3.5 text-plannera-orange shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Negociação</span>
          {!loading && <span className="text-[9px] text-content-secondary tabular-nums">{rows.length} registro(s)</span>}
        </div>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-content-secondary" /> : expanded ? <ChevronDown className="w-4 h-4 text-content-secondary/50" /> : <ChevronRight className="w-4 h-4 text-content-secondary/50" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {/* Lista */}
          {rows.length === 0 ? (
            <p className="text-[10px] text-content-secondary">Sem histórico de negociação registrado.</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-background/50 border border-border-divider/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-content-primary">{TYPE_LABEL[n.negotiation_type] ?? n.negotiation_type}</span>
                    <div className="flex items-center gap-2">
                      {n.outcome && <Badge className={`text-[9px] border-none ${OUTCOME_CLASS[n.outcome] ?? ''}`}>{OUTCOME_LABEL[n.outcome] ?? n.outcome}</Badge>}
                      <span className="text-[9px] text-content-secondary">{new Date(n.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  {(n.discount_offered_pct || n.discount_accepted_pct) ? (
                    <p className="text-[10px] text-content-secondary mt-1">Desconto: ofertado {n.discount_offered_pct ?? 0}% · aceito {n.discount_accepted_pct ?? 0}%</p>
                  ) : null}
                  {n.main_objection && <p className="text-[10px] text-content-secondary mt-0.5"><span className="font-bold">Objeção:</span> {n.main_objection}</p>}
                  {n.closing_argument && <p className="text-[10px] text-content-secondary mt-0.5"><span className="font-bold">Fechamento:</span> {n.closing_argument}</p>}
                  {n.notes && <p className="text-[10px] text-content-secondary mt-0.5">{n.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          {showForm ? (
            <div className="space-y-2 rounded-lg border border-border-divider/50 p-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={form.negotiation_type} onChange={(e) => setForm({ ...form, negotiation_type: e.target.value })} className={inputCls}>
                  <option value="initial">Venda inicial</option>
                  <option value="renewal">Renovação</option>
                  <option value="renegotiation">Renegociação</option>
                </select>
                <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className={inputCls}>
                  <option value="pending">Em aberto</option>
                  <option value="won">Fechado (venda)</option>
                  <option value="renewed">Renovado</option>
                  <option value="lost">Perdido</option>
                </select>
                <input type="number" value={form.discount_offered_pct} onChange={(e) => setForm({ ...form, discount_offered_pct: e.target.value })} placeholder="Desc. ofertado %" className={inputCls} />
                <input type="number" value={form.discount_accepted_pct} onChange={(e) => setForm({ ...form, discount_accepted_pct: e.target.value })} placeholder="Desc. aceito %" className={inputCls} />
              </div>
              <input value={form.counterpart_name} onChange={(e) => setForm({ ...form, counterpart_name: e.target.value })} placeholder="Contraparte (quem negociou)" className={inputCls} />
              <input value={form.main_objection} onChange={(e) => setForm({ ...form, main_objection: e.target.value })} placeholder="Principal objeção" className={inputCls} />
              <input value={form.closing_argument} onChange={(e) => setForm({ ...form, closing_argument: e.target.value })} placeholder="Argumento de fechamento" className={inputCls} />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas" rows={2} className={inputCls} />
              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY }) }} disabled={busy}>Cancelar</Button>
                <Button size="sm" onClick={submit} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Salvar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Registrar negociação
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
