'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { parseISO, differenceInCalendarDays, startOfWeek, endOfWeek, addDays, format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Download, Printer, Plus, Trash2, Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { Button } from '@/components/ui/button'

type Milestone = {
  id: string; name: string | null; stage_key: string | null; milestone_type: string | null
  status: string; planned_date: string | null; planned_end: string | null; sort_order: number
}
type Contract = {
  id: string; description: string | null; contract_code: string | null; account_id: string
  onboarding_status: string; onboarding_current_stage: string | null; onboarding_owner_id: string | null
  onboarding_started_at: string | null; onboarding_target_go_live: string | null; onboarding_template_id: string | null
  accounts?: { name?: string } | { name?: string }[]
}
type Template = { id: string; name: string }
type UserOpt = { id: string; full_name: string | null; email?: string | null }

const TYPE_OPTS = [
  ['kickoff', 'Kickoff'], ['workteam', 'GT'], ['training', 'Treinamento'],
  ['instance_setup', 'Instância/Config'], ['go_live', 'Go Live'], ['hypercare', 'Hypercare'],
  ['handover', 'Handover'], ['milestone', 'Marco'], ['other', 'Outro'],
] as const
const MS_STATUS = [['pending', 'Pendente'], ['in-progress', 'Em andamento'], ['done', 'Concluído'], ['skipped', 'Pulado']] as const

const COL_W = 76 // largura por semana (px)

function statusColor(m: Milestone): string {
  if (m.status === 'done') return '#10b981'
  if (m.status === 'skipped') return '#94a3b8'
  if (m.status === 'in-progress') return '#f59e0b'
  // pending
  if (m.planned_date) {
    const d = parseISO(m.planned_date)
    if (isValid(d) && differenceInCalendarDays(d, new Date()) < 0) return '#ef4444' // atrasado
  }
  return '#3b82f6'
}
const accName = (c: Contract | null) => (Array.isArray(c?.accounts) ? c?.accounts[0]?.name : c?.accounts?.name) ?? 'Conta'

export function OnboardingGanttClient({ contractId }: { contractId: string }) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [contract, setContract] = useState<Contract | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [exporting, setExporting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('milestone')
  const [newDate, setNewDate] = useState('')
  const ganttRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding?contract_id=${contractId}`)
      const data = await res.json()
      setContract(data.contract ?? null)
      setMilestones(data.milestones ?? [])
      setTemplates(data.templates ?? [])
    } finally { setLoading(false) }
  }, [contractId])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.ok ? r.json() : []).then(d => setUsers(Array.isArray(d) ? d : (d?.users ?? []))).catch(() => {}) }, [])

  const ownerName = useMemo(() => {
    const id = contract?.onboarding_owner_id
    return id ? (users.find(u => u.id === id)?.full_name || users.find(u => u.id === id)?.email || '—') : '—'
  }, [contract, users])
  const templateName = useMemo(() => templates.find(t => t.id === contract?.onboarding_template_id)?.name ?? '—', [templates, contract])

  // Geometria do Gantt
  const gantt = useMemo(() => {
    const dated = milestones.filter(m => m.planned_date && isValid(parseISO(m.planned_date)))
      .map(m => ({ ...m, d: parseISO(m.planned_date as string) }))
      .sort((a, b) => a.d.getTime() - b.d.getTime())
    if (dated.length === 0) return null
    const dates = dated.map(m => m.d)
    if (contract?.onboarding_target_go_live && isValid(parseISO(contract.onboarding_target_go_live))) dates.push(parseISO(contract.onboarding_target_go_live))
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    const rangeStart = startOfWeek(min, { weekStartsOn: 1 })
    const rangeEnd = endOfWeek(max, { weekStartsOn: 1 })
    const weeks: Date[] = []
    for (let w = rangeStart; w <= rangeEnd; w = addDays(w, 7)) weeks.push(w)
    const width = Math.max(weeks.length * COL_W, 480)
    const x = (d: Date) => (differenceInCalendarDays(d, rangeStart) / 7) * COL_W
    return { dated, weeks, width, rangeStart, x }
  }, [milestones, contract])

  const patchMs = async (id: string, body: Record<string, unknown>) => {
    setBusy(true)
    try { await fetch(`/api/onboarding/milestones/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); await load() }
    finally { setBusy(false) }
  }
  const delMs = async (id: string) => {
    if (!confirm('Remover este marco?')) return
    setBusy(true)
    try { await fetch(`/api/onboarding/milestones/${id}`, { method: 'DELETE' }); await load() } finally { setBusy(false) }
  }
  const addMs = async () => {
    if (!newName.trim()) return
    setBusy(true)
    try {
      await fetch('/api/onboarding/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contract_id: contractId, name: newName.trim(), milestone_type: newType, planned_date: newDate || null }) })
      setNewName(''); setNewDate(''); await load()
    } finally { setBusy(false) }
  }

  const exportPng = async () => {
    if (!ganttRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(ganttRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
      const a = document.createElement('a'); a.href = dataUrl; a.download = `cronograma-${accName(contract)}.png`; a.click()
    } catch (e) { console.error(e); alert('Falha ao exportar PNG.') } finally { setExporting(false) }
  }

  if (loading) return <PageContainer><div className="flex items-center justify-center min-h-[300px]"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div></PageContainer>

  return (
    <PageContainer>
      <style>{`@media print { body * { visibility: hidden !important } #gantt-export, #gantt-export * { visibility: visible !important } #gantt-export { position: absolute; left: 0; top: 0; width: 100% } }`}</style>

      <div className="flex items-center justify-between gap-3 mb-4 no-print">
        <Link href="/onboarding" className="text-[11px] text-content-secondary hover:text-content-primary flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Onboarding</Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> PDF</Button>
          <Button size="sm" onClick={exportPng} disabled={exporting}>{exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} PNG</Button>
        </div>
      </div>

      {/* ===== Região exportável (estilo fixo, independente de tema) ===== */}
      <div id="gantt-export" ref={ganttRef} style={{ background: '#ffffff', color: '#0f172a', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{accName(contract)}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{contract?.description || contract?.contract_code || 'Implantação'} · Cronograma de Implantação</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b' }}>
            <div>Responsável: <b style={{ color: '#0f172a' }}>{ownerName}</b></div>
            <div>Go-live alvo: <b style={{ color: '#0f172a' }}>{contract?.onboarding_target_go_live ? format(parseISO(contract.onboarding_target_go_live), 'dd/MM/yyyy') : '—'}</b></div>
            <div>Modelo: {templateName}</div>
          </div>
        </div>

        {!gantt ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Nenhum marco com data para exibir no cronograma.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ position: 'relative', width: gantt.width, minHeight: 150, paddingTop: 8 }}>
              {/* Cabeçalho de semanas */}
              <div style={{ position: 'relative', height: 22, borderBottom: '1px solid #e2e8f0' }}>
                {gantt.weeks.map((w, i) => (
                  <div key={i} style={{ position: 'absolute', left: i * COL_W, width: COL_W, fontSize: 9, color: '#94a3b8', textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                    {format(w, 'dd/MMM', { locale: ptBR })}
                  </div>
                ))}
              </div>
              {/* Linha do tempo + marcos */}
              <div style={{ position: 'relative', height: 110, marginTop: 18 }}>
                <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 2, background: '#e2e8f0' }} />
                {gantt.dated.map((m, i) => {
                  const left = gantt.x(m.d)
                  const color = statusColor(m)
                  const labelTop = i % 2 === 0 ? 30 : 56 // alterna p/ reduzir sobreposição
                  return (
                    <div key={m.id} style={{ position: 'absolute', left, top: 0, transform: 'translateX(-50%)', width: COL_W, textAlign: 'center' }}>
                      <div style={{ width: 14, height: 14, background: color, transform: 'rotate(45deg)', margin: '11px auto 0', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      <div style={{ marginTop: labelTop - 14, fontSize: 9.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{m.name ?? m.stage_key}</div>
                      <div style={{ fontSize: 8.5, color: '#64748b' }}>{format(m.d, 'dd/MM')}</div>
                    </div>
                  )
                })}
              </div>
              {/* Legenda */}
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 9, color: '#64748b' }}>
                <Legend c="#10b981" t="Concluído" /><Legend c="#f59e0b" t="Em andamento" /><Legend c="#3b82f6" t="Pendente" /><Legend c="#ef4444" t="Atrasado" />
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 8.5, color: '#cbd5e1', textAlign: 'right', marginTop: 8 }}>Plannera · CS-Continuum</div>
      </div>

      {/* ===== Editor de marcos (não exportado) ===== */}
      <div className="mt-6 no-print">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-2">Marcos do cronograma</h2>
        <div className="rounded-xl border border-border-divider/50 bg-surface-card/60 divide-y divide-border-divider/30">
          {milestones.sort((a, b) => (a.planned_date ?? '').localeCompare(b.planned_date ?? '') || a.sort_order - b.sort_order).map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 flex-wrap">
              <input defaultValue={m.name ?? ''} onBlur={(e) => { if (e.target.value !== (m.name ?? '')) patchMs(m.id, { name: e.target.value }) }}
                className="flex-1 min-w-[140px] text-[11px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary" />
              <select defaultValue={m.milestone_type ?? 'milestone'} onChange={(e) => patchMs(m.id, { milestone_type: e.target.value })} className="text-[10px] px-1.5 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary">
                {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="date" defaultValue={m.planned_date ?? ''} onChange={(e) => patchMs(m.id, { planned_date: e.target.value || null })} className="text-[10px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary" />
              <select value={m.status} onChange={(e) => patchMs(m.id, { status: e.target.value })} className="text-[10px] px-1.5 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary">
                {MS_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => delMs(m.id)} className="text-content-secondary/50 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {/* Adicionar marco */}
          <div className="flex items-center gap-2 p-2 flex-wrap bg-muted/20">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Novo marco (ex.: 5º GT)" className="flex-1 min-w-[140px] text-[11px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="text-[10px] px-1.5 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary">
              {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="text-[10px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary" />
            <Button size="sm" variant="outline" onClick={addMs} disabled={busy || !newName.trim()}><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar</Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, background: c, transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 1 }} />{t}</span>
}
