'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { Rocket, Download, AlertTriangle, Clock, Library, Search } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type NextMs = { name: string | null; planned_date: string | null } | null
type Item = {
  contract_id: string
  contract_label: string
  account_id: string
  account_name: string
  onboarding_status: string
  onboarding_current_stage: string | null
  onboarding_health: string | null
  owner_name: string
  started_at: string | null
  target_go_live: string | null
  completed_at: string | null
  next_milestone: NextMs
  progress: { done: number; total: number; pct: number }
}

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Não iniciado', 'in-progress': 'Em andamento', 'on-hold': 'Pausado', 'completed': 'Concluído', 'cancelled': 'Cancelado',
}
const HEALTH_LABEL: Record<string, string> = { 'on-track': 'No prazo', 'at-risk': 'Em risco', 'stalled': 'Travado' }
const ACTIVE = new Set(['in-progress', 'on-hold'])

const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null)
const fmtDate = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '—')

export function OnboardingClient() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const kpis = useMemo(() => {
    const active = items.filter((i) => ACTIVE.has(i.onboarding_status))
    const now = Date.now()
    const overdue = active.filter((i) => i.target_go_live && new Date(i.target_go_live).getTime() < now).length
    const stalled = active.filter((i) => i.onboarding_health === 'stalled' || i.onboarding_health === 'at-risk').length
    const days = active.map((i) => daysSince(i.started_at)).filter((d): d is number => d !== null)
    const avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0
    return { activeCount: active.length, overdue, stalled, avgDays }
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (statusFilter === 'active' && !ACTIVE.has(i.onboarding_status)) return false
      if (statusFilter !== 'active' && statusFilter !== 'all' && i.onboarding_status !== statusFilter) return false
      if (q && !`${i.account_name} ${i.contract_label} ${i.owner_name}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, statusFilter])

  const exportXlsx = useCallback(() => {
    const rows = filtered.map((i) => ({
      Conta: i.account_name, Contrato: i.contract_label,
      Status: STATUS_LABEL[i.onboarding_status] ?? i.onboarding_status,
      'Etapa atual': i.onboarding_current_stage ?? '—',
      'Próximo marco': i.next_milestone?.name ?? '—',
      'Data próx. marco': fmtDate(i.next_milestone?.planned_date ?? null),
      Responsável: i.owner_name || '—',
      'Progresso (%)': i.progress.pct,
      'Dias em onboarding': daysSince(i.started_at) ?? '—',
      'Go-live alvo': fmtDate(i.target_go_live),
      Saúde: HEALTH_LABEL[i.onboarding_health ?? ''] ?? '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Onboarding')
    XLSX.writeFile(wb, `onboarding_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [filtered])

  return (
    <PageContainer>
      <ModuleHeader title="Onboarding & Implantação" subtitle="Projetos de implantação por contrato — cronograma, marcos e go-live" iconName="Rocket">
        <Link href="/onboarding/templates"><Button variant="outline" size="sm"><Library className="w-4 h-4 mr-2" /> Modelos</Button></Link>
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={filtered.length === 0}><Download className="w-4 h-4 mr-2" /> Exportar</Button>
      </ModuleHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardPremium title="Em onboarding" value={kpis.activeCount} icon={Rocket} colorVariant="default" />
        <StatCardPremium title="Atrasados (go-live)" value={kpis.overdue} icon={AlertTriangle} colorVariant="destructive" />
        <StatCardPremium title="Em risco / travados" value={kpis.stalled} icon={AlertTriangle} colorVariant="orange" />
        <StatCardPremium title="Tempo médio (dias)" value={kpis.avgDays} icon={Clock} colorVariant="ds" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary/50" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conta, contrato ou responsável…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-card border border-border-divider text-sm text-content-primary placeholder:text-content-secondary/50 focus:outline-none focus:ring-2 focus:ring-plannera-primary/30" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-surface-card border border-border-divider text-sm text-content-primary">
          <option value="active">Ativos</option>
          <option value="all">Todos</option>
          <option value="in-progress">Em andamento</option>
          <option value="on-hold">Pausado</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <Card className="rounded-2xl bg-surface-card/60 border border-border-divider/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-divider/50 text-content-secondary">
                {['Conta / Contrato', 'Próximo marco', 'Responsável', 'Progresso', 'Dias', 'Go-live', 'Status'].map((h) => (
                  <th key={h} className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-content-secondary">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-content-secondary">Nenhum contrato em onboarding.</td></tr>
              ) : filtered.map((i) => (
                <tr key={i.contract_id} onClick={() => router.push(`/onboarding/${i.contract_id}`)} className="border-b border-border-divider/30 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3"><div className="font-bold text-content-primary">{i.account_name}</div><div className="text-[11px] text-content-secondary">{i.contract_label}</div></td>
                  <td className="px-4 py-3"><div className="text-content-primary">{i.next_milestone?.name ?? i.onboarding_current_stage ?? '—'}</div><div className="text-[11px] text-content-secondary">{fmtDate(i.next_milestone?.planned_date ?? null)}</div></td>
                  <td className="px-4 py-3 text-content-secondary">{i.owner_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-plannera-primary" style={{ width: `${i.progress.pct}%` }} /></div>
                      <span className="text-[11px] text-content-secondary tabular-nums">{i.progress.done}/{i.progress.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-content-secondary tabular-nums">{daysSince(i.started_at) ?? '—'}</td>
                  <td className="px-4 py-3 text-content-secondary">{fmtDate(i.target_go_live)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge className={'border-none text-[10px] w-fit ' + (i.onboarding_status === 'completed' ? 'bg-success/20 text-success' : i.onboarding_status === 'on-hold' ? 'bg-amber-500/20 text-amber-600' : i.onboarding_status === 'cancelled' ? 'bg-muted text-content-secondary' : 'bg-plannera-primary/20 text-plannera-primary')}>
                        {STATUS_LABEL[i.onboarding_status] ?? i.onboarding_status}
                      </Badge>
                      {i.onboarding_health && i.onboarding_health !== 'on-track' && ACTIVE.has(i.onboarding_status) && (
                        <span className="text-[9px] font-bold uppercase text-rose-500">{HEALTH_LABEL[i.onboarding_health]}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  )
}
