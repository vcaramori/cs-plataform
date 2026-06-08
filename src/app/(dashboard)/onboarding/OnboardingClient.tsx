'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Rocket, Download, AlertTriangle, Clock, CheckCircle2, Search } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Stage = { key: string; label: string; sort_order: number }
type Item = {
  contract_id: string
  contract_label: string
  account_id: string
  account_name: string
  onboarding_status: string
  onboarding_current_stage: string | null
  onboarding_health: string | null
  onboarding_owner_id: string | null
  owner_name: string
  started_at: string | null
  target_go_live: string | null
  completed_at: string | null
  progress: { done: number; total: number; pct: number }
}

const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Não iniciado',
  'in-progress': 'Em andamento',
  'on-hold': 'Pausado',
  'completed': 'Concluído',
  'cancelled': 'Cancelado',
}
const HEALTH_LABEL: Record<string, string> = {
  'on-track': 'No prazo',
  'at-risk': 'Em risco',
  'stalled': 'Travado',
}
const ACTIVE = new Set(['in-progress', 'on-hold'])

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function OnboardingClient() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding')
      const data = await res.json()
      setStages(data.stages ?? [])
      setItems(data.items ?? [])
    } catch {
      setStages([])
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stageLabel = useCallback(
    (key: string | null) => (key ? (stages.find((s) => s.key === key)?.label ?? key) : '—'),
    [stages]
  )

  // KPIs
  const kpis = useMemo(() => {
    const active = items.filter((i) => ACTIVE.has(i.onboarding_status))
    const now = Date.now()
    const overdue = active.filter((i) => i.target_go_live && new Date(i.target_go_live).getTime() < now).length
    const stalled = active.filter((i) => i.onboarding_health === 'stalled' || i.onboarding_health === 'at-risk').length
    const days = active.map((i) => daysSince(i.started_at)).filter((d): d is number => d !== null)
    const avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0
    return { activeCount: active.length, overdue, stalled, avgDays }
  }, [items])

  // Board por etapa (apenas ativos)
  const board = useMemo(() => {
    const active = items.filter((i) => ACTIVE.has(i.onboarding_status))
    return stages.map((s) => ({
      ...s,
      count: active.filter((i) => i.onboarding_current_stage === s.key).length,
    }))
  }, [items, stages])

  // Tabela filtrada
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (statusFilter === 'active' && !ACTIVE.has(i.onboarding_status)) return false
      if (statusFilter !== 'active' && statusFilter !== 'all' && i.onboarding_status !== statusFilter) return false
      if (stageFilter !== 'all' && i.onboarding_current_stage !== stageFilter) return false
      if (q && !(`${i.account_name} ${i.contract_label} ${i.owner_name}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, search, statusFilter, stageFilter])

  const exportXlsx = useCallback(() => {
    const rows = filtered.map((i) => ({
      Conta: i.account_name,
      Contrato: i.contract_label,
      Status: STATUS_LABEL[i.onboarding_status] ?? i.onboarding_status,
      'Etapa atual': stageLabel(i.onboarding_current_stage),
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
  }, [filtered, stageLabel])

  return (
    <PageContainer>
      <ModuleHeader
        title="Onboarding & Implantação"
        subtitle="Acompanhe a implantação de cada contrato por etapa — do welcome meeting ao handover"
        iconName="Rocket"
      >
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </ModuleHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardPremium title="Em onboarding" value={kpis.activeCount} icon={Rocket} colorVariant="default" />
        <StatCardPremium title="Atrasados (go-live)" value={kpis.overdue} icon={AlertTriangle} colorVariant="destructive" />
        <StatCardPremium title="Em risco / travados" value={kpis.stalled} icon={AlertTriangle} colorVariant="orange" />
        <StatCardPremium title="Tempo médio (dias)" value={kpis.avgDays} icon={Clock} colorVariant="ds" />
      </div>

      {/* Board por etapa */}
      <Card className="p-4 rounded-2xl bg-surface-card/60 border border-border-divider/50">
        <p className="label-premium uppercase tracking-widest text-[10px] opacity-70 mb-3">Distribuição por etapa (ativos)</p>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {board.map((s) => (
            <button
              key={s.key}
              onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}
              className={
                'flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ' +
                (stageFilter === s.key
                  ? 'border-plannera-primary/50 bg-plannera-primary/10'
                  : 'border-border-divider/50 hover:bg-muted/30')
              }
            >
              <span className="text-2xl font-extrabold text-content-primary leading-none">{s.count}</span>
              <span className="text-[9px] font-bold uppercase tracking-tight text-content-secondary text-center leading-tight line-clamp-2">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conta, contrato ou responsável…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-card border border-border-divider text-sm text-content-primary placeholder:text-content-secondary/50 focus:outline-none focus:ring-2 focus:ring-plannera-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-surface-card border border-border-divider text-sm text-content-primary"
        >
          <option value="active">Ativos</option>
          <option value="all">Todos</option>
          <option value="in-progress">Em andamento</option>
          <option value="on-hold">Pausado</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-surface-card border border-border-divider text-sm text-content-primary"
        >
          <option value="all">Todas as etapas</option>
          {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <Card className="rounded-2xl bg-surface-card/60 border border-border-divider/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-divider/50 text-content-secondary">
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Conta / Contrato</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Etapa atual</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Responsável</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Progresso</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Dias</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Go-live</th>
                <th className="text-left font-bold uppercase tracking-tight text-[10px] px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-content-secondary">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-content-secondary">Nenhum contrato em onboarding.</td></tr>
              ) : filtered.map((i) => (
                <tr
                  key={i.contract_id}
                  onClick={() => router.push(`/accounts/${i.account_id}`)}
                  className="border-b border-border-divider/30 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-content-primary">{i.account_name}</div>
                    <div className="text-[11px] text-content-secondary">{i.contract_label}</div>
                  </td>
                  <td className="px-4 py-3 text-content-primary">{stageLabel(i.onboarding_current_stage)}</td>
                  <td className="px-4 py-3 text-content-secondary">{i.owner_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-plannera-primary" style={{ width: `${i.progress.pct}%` }} />
                      </div>
                      <span className="text-[11px] text-content-secondary tabular-nums">{i.progress.done}/{i.progress.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-content-secondary tabular-nums">{daysSince(i.started_at) ?? '—'}</td>
                  <td className="px-4 py-3 text-content-secondary">{fmtDate(i.target_go_live)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge className={
                        'border-none text-[10px] w-fit ' +
                        (i.onboarding_status === 'completed' ? 'bg-success/20 text-success'
                          : i.onboarding_status === 'on-hold' ? 'bg-amber-500/20 text-amber-600'
                          : i.onboarding_status === 'cancelled' ? 'bg-muted text-content-secondary'
                          : 'bg-plannera-primary/20 text-plannera-primary')
                      }>
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

      {!loading && items.some((i) => i.onboarding_status === 'completed') && (
        <p className="text-[11px] text-content-secondary flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          {items.filter((i) => i.onboarding_status === 'completed').length} onboarding(s) concluído(s) — use o filtro "Concluído" para revisar.
        </p>
      )}
    </PageContainer>
  )
}
