'use client'

import { PageContainer } from '@/components/ui/page-container'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  SmilePlus, Meh, Frown, Star, RefreshCw, Sparkles,
  Building2, ListChecks, AlignLeft, Hash, Bookmark,
  CalendarRange, Globe, Target, AlertTriangle, TrendingUp, TrendingDown, Loader2
} from 'lucide-react'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { StatusBadgeGuard } from '@/components/shared/guardians/StatusBadgeGuard'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
  Tooltip as RechartsTooltip
} from 'recharts'
import { getNPSSegment } from '@/lib/supabase/types'
import type { NPSStats } from '@/lib/supabase/types'
import { useDateRange } from '@/hooks/useDateRange'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { ScoreBar } from './components/ScoreBar'
import { NPSGauge } from './components/NPSGauge'
import { ResponseDetailDialog } from './components/ResponseDetailDialog'
import ResponseCarousel from './components/ResponseCarousel'
import { NPSResponseCard } from './components/NPSResponseCard'
import { NPSFilters } from './components/NPSFilters'


interface Props {
  accounts: { id: string; name: string }[]
}

export interface NPSQuestion {
  id: string
  title: string
  type: string
}

export interface NPSAnswer {
  id: string
  question_id: string
  text_value: string
  selected_options: string[]
  nps_questions: NPSQuestion
}

export interface NPSResponseDetail {
  id: string
  account_id: string
  program_key: string
  user_email: string
  score: number
  comment?: string
  responded_at: string
  account_name: string
  nps_answers?: NPSAnswer[]
}

export interface NPSDashboardStats {
  nps_score: number
  total_responses: number
  promoters: number
  passives: number
  detractors: number
  avg_score: number
  responses: NPSResponseDetail[]
}

interface Program {
  id: string
  program_key: string
  name?: string
  is_active?: boolean
  accounts?: { name: string }
}

interface ParetoItem {
  name: string
  p: number
  n: number
  d: number
  total: number
  score: number
}

interface ChartItem {
  date: string
  nps: number
  total: number
}

// ─── Components extracted to ./components/ ──────────────────────────────────


// ─── Main Client ─────────────────────────────────────────────────────────────

export function NPSDashboardClient({ accounts }: Props) {
  const [accountFilter, setAccountFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('default')
  const { dateFrom, dateTo } = useDateRange('30d')
  const [stats, setStats] = useState<NPSDashboardStats | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<NPSResponseDetail | null>(null)
  const [goal, setGoal] = useState<number | null>(null)
  const [newGoalValue, setNewGoalValue] = useState('')
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [paretoSortBy, setParetoSortBy] = useState<'promoters' | 'passives' | 'detractors'>('promoters')
  const [paretoData, setParetoData] = useState<ParetoItem[]>([])
  const [chartData, setChartData] = useState<ChartItem[]>([])


  const fetchData = useCallback(async () => {
    setLoading(true)
    const statsParams = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    })
    if (accountFilter !== 'all') statsParams.set('account_id', accountFilter)
    if (programFilter !== 'default') statsParams.set('program_key', programFilter)

    const programsParams = accountFilter !== 'all' ? `?account_id=${accountFilter}` : ''

    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/nps/stats?${statsParams}`),
        fetch(`/api/nps/programs${programsParams}`),
      ])
      const sData = sRes.ok ? await sRes.json() : null
      const pData = pRes.ok ? await pRes.json() : []
      if (sData) setStats(sData)
      if (pData) setPrograms(Array.isArray(pData) ? pData : [])
    } catch (err) {
      console.error('[Dashboard] fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }, [accountFilter, dateFrom, dateTo, programFilter])

  const fetchGoal = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (programFilter !== 'default') {
        const prog = programs.find(p => p.program_key === programFilter)
        if (prog) params.set('program_id', prog.id)
      }
      const res = await fetch(`/api/nps/goals?${params}`)
      const data = await res.json()
      setGoal(data.goal_score ?? 75)
    } catch (err) {
      console.error('[Dashboard] fetchGoal error:', err)
      setGoal(75)
    }
  }, [programFilter, programs])

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchGoal() }, [fetchGoal])

  useEffect(() => {
    if (!stats || !stats.responses.length) {
      setChartData([]); setParetoData([])
      return
    }

    const grouped: Record<string, { p: number, n: number, d: number, total: number }> = {}
    const paretoRaw: Record<string, { name: string, p: number, n: number, d: number, total: number }> = {}

    stats.responses.forEach((r: NPSResponseDetail) => {
      if (!r.responded_at || r.score === null) return
      const dateKey = new Date(r.responded_at).toLocaleDateString('pt-BR')
      if (!grouped[dateKey]) grouped[dateKey] = { p: 0, n: 0, d: 0, total: 0 }
      grouped[dateKey].total++

      const acc = r.account_name || 'Global'
      if (!paretoRaw[acc]) paretoRaw[acc] = { name: acc, p: 0, n: 0, d: 0, total: 0 }
      paretoRaw[acc].total++

      const seg = getNPSSegment(r.score)
      if (seg === 'promoter') { grouped[dateKey].p++; paretoRaw[acc].p++ }
      else if (seg === 'passive') { grouped[dateKey].n++; paretoRaw[acc].n++ }
      else { grouped[dateKey].d++; paretoRaw[acc].d++ }
    })

    const cData = Object.entries(grouped)
      .map(([date, counts]) => ({
        date,
        nps: Math.round(((counts.p - counts.d) / counts.total) * 100),
        total: counts.total
      }))
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/'); const [d2, m2, y2] = b.date.split('/')
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime()
      })
    setChartData(cData)

    const pData = Object.values(paretoRaw).map(v => ({
      ...v,
      score: v.total > 0 ? Math.round(((v.p - v.d) / v.total) * 100) : 0
    }))
    setParetoData(pData)
  }, [stats])

  function handleExportExcel() {
    if (!stats?.responses.length) return toast.error('Sem dados para exportar.')
    const data = stats.responses.map((r: NPSResponseDetail) => {
      const base: Record<string, string | number> = {
        'Respondente': r.user_email || 'Anônimo',
        'Conta': r.account_name,
        'Nota': r.score,
        'Data': r.responded_at ? new Date(r.responded_at).toLocaleDateString('pt-BR') : '',
        'Comentário': r.comment || '',
      }
      r.nps_answers?.forEach((ans: NPSAnswer) => {
        const title = ans.nps_questions?.title || `Questão ${ans.question_id.slice(0, 4)}`
        base[title] = ans.nps_questions?.type === 'multiple_choice' ? (ans.selected_options || []).join(', ') : ans.text_value
      })
      return base
    })
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'NPS Stats')
    XLSX.writeFile(wb, `nps_stats_${new Date().getFullYear()}.xlsx`)
    toast.success('Planilha gerada com sucesso!')
  }

  async function handleSetGoal() {
    const val = parseInt(newGoalValue, 10)
    if (isNaN(val)) return toast.error('Insira um número válido.')
    setIsUpdatingGoal(true)
    try {
      const res = await fetch('/api/nps/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_score: val }),
      })
      if (res.ok) {
        toast.success('Meta atualizada!'); setNewGoalValue(''); fetchGoal()
      } else {
        toast.error('Erro ao salvar meta.')
      }
    } finally {
      setIsUpdatingGoal(false)
    }
  }

  const responses = stats?.responses ?? []

  return (
    <PageContainer>
      <ModuleHeader
        title="Inteligência de NPS"
        subtitle="Lealdade, pesquisas relacionais e feedback estruturado dos clientes"
        iconName="Star"
      />

      <DateRangePicker />

      <NPSFilters
        programFilter={programFilter}
        onProgramChange={setProgramFilter}
        accountFilter={accountFilter}
        onAccountChange={setAccountFilter}
        goal={goal}
        newGoalValue={newGoalValue}
        onGoalValueChange={setNewGoalValue}
        isUpdatingGoal={isUpdatingGoal}
        onSetGoal={handleSetGoal}
        onExport={handleExportExcel}
        onRefresh={fetchData}
        isLoading={loading}
        programs={programs}
        accounts={accounts}
      />


      {/* Main Stats Card */}
      {loading ? (
        <div className="h-80 w-full animate-pulse bg-surface-card rounded-2xl border border-border-divider shadow-lg" />
      ) : stats ? (
        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-2xl bg-surface-card/80 backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-divider">

              {/* Section 1: Score Gauge */}
              <div className="lg:col-span-3 relative p-8 flex flex-col items-center justify-center bg-gradient-to-br from-plannera-primary/[0.05] to-transparent min-h-[280px]">
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <Area type="monotone" dataKey="nps" stroke="none" fill="var(--plannera-primary)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="relative z-10"><NPSGauge score={stats.nps_score} goal={goal} /></div>
              </div>

              {/* Section 2: Core Metrics */}
              <div className="lg:col-span-4 p-8 flex flex-col justify-center gap-8">
                <div className="grid grid-cols-2 gap-y-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.25em] opacity-60">Volume Amostral</p>
                    <p className="text-5xl font-black text-content-primary tracking-tighter leading-none tabular-nums">{stats.total_responses}</p>
                  </div>
                  <div className="space-y-3 ml-6 border-l border-border-divider pl-10">
                    <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.25em] opacity-60">Média Ponderada</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black text-plannera-primary tracking-tighter leading-none tabular-nums">{stats.avg_score}</p>
                      <span className="text-xs font-black text-content-secondary/20">/10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-border-divider/50">
                  <ScoreBar label="Promotores" count={stats.promoters} total={stats.total_responses} color="bg-success shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                  <ScoreBar label="Neutros" count={stats.passives} total={stats.total_responses} color="bg-amber-400 opacity-50" />
                  <ScoreBar label="Detratores" count={stats.detractors} total={stats.total_responses} color="bg-destructive shadow-[0_0_20px_rgba(239,68,68,0.3)]" />
                </div>
              </div>

              {/* Section 3: Ranking por conta */}
              <div className="lg:col-span-5 p-8 flex flex-col space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-plannera-primary/10 border border-plannera-primary/20">
                      <Building2 className="w-5 h-5 text-plannera-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter text-content-primary leading-none">Desempenho por Conta</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-content-secondary/50 mt-1">Ordenar por segmento</p>
                    </div>
                  </div>
                  <div className="flex bg-surface-background/50 p-1 rounded-2xl border border-border-divider shadow-inner gap-1">
                    {([
                      ['promoters', 'Promotores', 'bg-success'],
                      ['passives', 'Neutros', 'bg-amber-400'],
                      ['detractors', 'Detratores', 'bg-destructive'],
                    ] as const).map(([s, label, dot]) => (
                      <button key={s} onClick={() => setParetoSortBy(s)} title={`Ordenar por ${label}`}
                        className={cn(
                          "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide",
                          paretoSortBy === s
                            ? 'bg-surface-card text-content-primary shadow-sm'
                            : 'text-content-secondary/60 hover:text-content-primary'
                        )}>
                        <span className={cn('w-2 h-2 rounded-full', dot, s === 'passives' && 'opacity-60')} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-6 max-h-[250px] overflow-y-auto pr-6 custom-scrollbar">
                  {[...paretoData].sort((a, b) => {
                    const valA = paretoSortBy === 'promoters' ? a.p : paretoSortBy === 'passives' ? a.n : a.d
                    const valB = paretoSortBy === 'promoters' ? b.p : paretoSortBy === 'passives' ? b.n : b.d
                    return valB - valA
                  }).slice(0, 15).map((acc, i) => (
                    <div key={acc.name} className="flex items-center gap-6 group">
                      <span className="w-6 text-[11px] font-black text-content-secondary/20 italic tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-content-primary text-[10px] font-black truncate group-hover:text-plannera-primary transition-all uppercase tracking-tight">{acc.name}</p>
                          <div className={cn("text-sm font-black tracking-tighter tabular-nums", acc.score >= (goal ?? 75) ? 'text-success' : 'text-destructive')}>
                            {acc.score > 0 ? '+' : ''}{acc.score}
                          </div>
                        </div>
                        <div className="flex h-2.5 bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider">
                          {acc.p > 0 && <div className="bg-success h-full transition-all duration-1000" style={{ width: `${(acc.p / acc.total) * 100}%` }} />}
                          {acc.n > 0 && <div className="bg-amber-400 h-full opacity-50 transition-all duration-1000" style={{ width: `${(acc.n / acc.total) * 100}%` }} />}
                          {acc.d > 0 && <div className="bg-destructive h-full transition-all duration-1000" style={{ width: `${(acc.d / acc.total) * 100}%` }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {paretoData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-border-divider rounded-2xl opacity-50">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-content-secondary">Aguardando dados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Feed de respostas */}
      {!loading && responses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          {responses.slice(0, 14).map((r: NPSResponseDetail, i: number) => (
            <NPSResponseCard
              key={r.id}
              response={r}
              index={i}
              onSelect={() => setSelectedResponse(r)}
            />
          ))}
        </div>
      )}


      {!loading && responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-background/30 border-2 border-dashed border-border-divider/60 rounded-2xl mt-8">
          <div className="w-20 h-20 bg-surface-card rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-content-secondary/50" />
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.3em] text-center text-content-secondary">Nenhuma resposta no período</p>
          <p className="text-[11px] text-content-secondary/60 mt-2 text-center max-w-sm">Ajuste o período acima ou cadastre programas de pesquisa em <span className="font-bold">Gestão</span>.</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)}>
        <ResponseDetailDialog render={selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)} />
      </Dialog>
    </PageContainer>
  )
}
