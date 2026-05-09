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

interface Props {
  accounts: { id: string; name: string }[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="label-premium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-background rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-content-primary text-[10px] font-extrabold w-8 text-right">{count}</span>
      <span className="text-content-secondary text-[9px] font-bold w-10 text-right">{pct}%</span>
    </div>
  )
}

function NPSGauge({ score, goal }: { score: number, goal: number | null }) {
  const g = goal ?? 75
  const c = Math.max(-100, Math.min(100, score))
  const isMet = c >= g
  const color = isMet ? 'text-emerald-500' : 'text-destructive'
  const label = isMet ? 'Meta Atingida' : 'Abaixo da Meta'

  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div className={`text-6xl font-extrabold tracking-tighter ${color} transition-transform group-hover:scale-105 duration-300`}>
        {c > 0 ? '+' : ''}{c}
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-surface-card border border-border-divider shadow-sm">
        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMet ? "bg-emerald-500" : "bg-destructive")} />
        <span className={isMet ? 'text-emerald-500' : 'text-destructive'}>{label}</span>
      </div>
      <div className="label-premium mt-4 flex items-center gap-2">
        <span>NPS SCORE</span>
        <span className="opacity-20">/</span>
        <span className="text-foreground">META: {g}</span>
      </div>
    </div>
  )
}

// ─── Modal de Detalhes ───────────────────────────────────────────────────────
function ResponseDetailDialog({ render, onOpenChange }: { render: any; onOpenChange: (open: boolean) => void }) {
  if (!render) return null

  const answers = render.nps_answers || []
  const seg = render.score !== null ? getNPSSegment(render.score) : null
  const segColor = seg === 'promoter' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : seg === 'passive' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-destructive bg-destructive/10 border-destructive/20'

  return (
    <DialogContent aria-describedby={undefined} className="bg-background border-border max-w-xl p-0 overflow-hidden rounded-2xl shadow-2xl">
      <div className="p-8 space-y-8">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-6">
          <div className="space-y-1">
            <DialogTitle className="h2-section !text-xl !text-foreground">Feedback Detalhado</DialogTitle>
            <p className="label-premium opacity-60">{render.account_name}</p>
          </div>
          <Badge className={`text-[10px] font-extrabold border uppercase px-3 py-1 rounded-2xl shadow-sm ${segColor}`}>
            {seg || 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="space-y-8 py-2">
          {/* Respondente */}
          <div className="flex items-center justify-between bg-surface-background p-4 rounded-2xl border border-border-divider">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
                <Input type="hidden" />
                <span className="text-content-primary font-extrabold text-xl">{render.user_email?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
              <div>
                <p className="text-content-primary text-sm font-extrabold tracking-tight">{render.user_email || 'Anônimo'}</p>
                <p className="label-premium !text-[9px] opacity-50 lowercase tracking-tight font-medium">
                  {render.responded_at ? new Date(render.responded_at).toLocaleString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="label-premium !text-[9px]">Nota NPS</p>
              <p className="text-3xl font-extrabold tracking-tighter text-content-primary">{render.score}<span className="text-xs opacity-60">/10</span></p>
            </div>
          </div>

          {/* Respostas */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-4 h-4 text-primary" />
              <p className="label-premium">Análise do Questionário</p>
            </div>

            {render.comment && (
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <p className="label-premium opacity-60 mb-1">Comentário Estruturado</p>
                <p className="text-foreground text-sm italic font-medium leading-relaxed tracking-tight">"{render.comment}"</p>
              </div>
            )}

            <div className="space-y-4">
              {answers.length === 0 && !render.comment ? (
                <div className="py-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center opacity-60">
                  <p className="label-premium">Sem dados detalhados</p>
                </div>
              ) : (
                answers.map((ans: any) => (
                  <div key={ans.id} className="space-y-2 p-5 rounded-2xl bg-surface-card border border-border-divider hover:bg-surface-background transition-all group">
                    <p className="label-premium !text-[9px] opacity-60 group-hover:opacity-100 transition-opacity">{ans.nps_questions?.title || 'Componente do Feedback'}</p>
                    <div className="text-content-primary text-sm font-extrabold tracking-tight leading-relaxed">
                      {ans.nps_questions?.type === 'nps_scale' ? (
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 bg-surface-background rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary" style={{ width: `${(parseInt(ans.text_value) / 10) * 100}%` }} />
                          </div>
                          <span className="text-primary font-extrabold tracking-tighter">{ans.text_value}<span className="text-[10px] opacity-60">/10</span></span>
                        </div>
                      ) : ans.nps_questions?.type === 'multiple_choice' ? (
                        <div className="flex flex-wrap gap-2">
                          {(ans.selected_options || []).map((opt: string) => (
                            <Badge key={opt} variant="neutral" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-extrabold uppercase tracking-widest px-3">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap font-medium text-muted-foreground">{ans.text_value || '—'}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-surface-background border-t border-border-divider flex justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-8 h-10 label-premium">
          Fechar Relatório
        </Button>
      </div>
    </DialogContent>
  )
}

// ─── Carrossel de Respostas ──────────────────────────────────────────────────
function ResponseCarousel({ ansList, scoreColor }: { ansList: any[], scoreColor: string }) {
  const [idx, setIdx] = useState(0)
  const validAnswers = ansList.filter(a => a.is_comment || a.text_value || (a.selected_options && a.selected_options.length > 0))

  useEffect(() => {
    if (validAnswers.length <= 1) return
    const timer = setInterval(() => setIdx(prev => (prev + 1) % validAnswers.length), 5000)
    return () => clearInterval(timer)
  }, [validAnswers.length])

  if (validAnswers.length === 0) return <p className="label-premium opacity-60 italic">Sem comentários registrados</p>

  const ans = validAnswers[idx]
  const qTitle = ans.is_comment ? 'Feedback Direto' : (ans.nps_questions?.title || 'Resposta')
  const val = ans.is_comment ? ans.text_value : (ans.nps_questions?.type === 'multiple_choice'
    ? (ans.selected_options || []).join(', ')
    : ans.text_value)

  return (
    <div className="relative h-10 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0 flex flex-col justify-center">
          <span className={cn("label-premium !text-[8px] opacity-60 mb-0.5", scoreColor)}>{qTitle}</span>
          <span className="text-foreground font-medium text-[11px] truncate leading-tight tracking-tight" title={val}>{val}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Main Client ─────────────────────────────────────────────────────────────

export function NPSDashboardClient({ accounts }: Props) {
  const [accountFilter, setAccountFilter] = useState('all')
  const [periodDays, setPeriodDays] = useState('30')
  const [programFilter, setProgramFilter] = useState('default')
  const [stats, setStats] = useState<NPSStats | null>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResponse, setSelectedResponse] = useState<any>(null)
  const [goal, setGoal] = useState<number | null>(null)
  const [newGoalValue, setNewGoalValue] = useState('')
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [paretoSortBy, setParetoSortBy] = useState<'promoters' | 'passives' | 'detractors'>('promoters')
  const [paretoData, setParetoData] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const dateFrom = new Date(now.getTime() - parseInt(periodDays) * 24 * 60 * 60 * 1000)

    const statsParams = new URLSearchParams({
      date_from: dateFrom.toISOString(),
      date_to: now.toISOString(),
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
  }, [accountFilter, periodDays, programFilter])

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

    stats.responses.forEach((r: any) => {
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
    const data = stats.responses.map((r: any) => {
      const base: any = {
        'Respondente': r.user_email || 'Anônimo',
        'Conta': r.account_name,
        'Nota': r.score,
        'Data': r.responded_at ? new Date(r.responded_at).toLocaleDateString('pt-BR') : '',
        'Comentário': r.comment || '',
      }
      r.nps_answers?.forEach((ans: any) => {
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
        title="NPS Research Control" 
        subtitle="Inteligência de Atendimento, Pesquisas Relacionais e Feedback Estruturado"
        iconName="Star"
      />

      {/* Filter Bar — Two-row layout to prevent overflow on mid-viewports */}
      <div className="flex flex-col gap-3 bg-surface-card border border-border-divider p-4 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-plannera-orange/60" />
        
        {/* Row 1: Selects + Refresh */}
        <div className="flex flex-wrap items-center gap-3 pl-2">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-52 text-content-primary text-[10px] font-black h-10 rounded-2xl bg-surface-background/50 border-border-divider hover:bg-surface-background transition-all shadow-sm uppercase tracking-widest">
              <Bookmark className="w-4 h-4 text-plannera-primary/40 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-card border-border-divider rounded-2xl">
              <SelectItem value="default" className="text-[10px] font-black uppercase tracking-widest">GLOBAL PORTFOLIO</SelectItem>
              {programs.filter(p => p.is_active).map(p => (
                <SelectItem key={p.program_key} value={p.program_key} className="text-[10px] font-black uppercase tracking-widest">{p.name || p.accounts?.name || 'PROGRAM'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-44 text-content-primary text-[10px] font-black h-10 rounded-2xl bg-surface-background/50 border-border-divider hover:bg-surface-background transition-all shadow-sm uppercase tracking-widest">
              <Building2 className="w-4 h-4 text-content-secondary/40 mr-2" />
              <SelectValue placeholder="CONTAS" />
            </SelectTrigger>
            <SelectContent className="bg-surface-card border-border-divider rounded-2xl">
              <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">TODAS AS CONTAS</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px] font-black uppercase tracking-widest">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-36 text-content-primary text-[10px] font-black h-10 rounded-2xl bg-surface-background/50 border-border-divider hover:bg-surface-background transition-all shadow-sm uppercase tracking-widest">
              <CalendarRange className="w-4 h-4 text-content-secondary/40 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-card border-border-divider rounded-2xl">
              {['7', '30', '90', '180', '365'].map(v => <SelectItem key={v} value={v} className="text-[10px] font-black uppercase tracking-widest">{v} DIAS</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-10 w-10 text-content-secondary/40 hover:text-plannera-primary bg-surface-background/50 rounded-2xl border border-border-divider shadow-sm transition-all active:scale-90">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Row 2: Meta NPS (prominent) + Export + Manage */}
        <div className="flex flex-wrap items-center gap-3 pl-2 pt-1 border-t border-border-divider/50">
          {/* Goal Display */}
          <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-plannera-orange/5 border border-plannera-orange/20 shadow-inner group transition-all hover:border-plannera-orange/40">
            <div className="flex items-baseline gap-2">
              <span className="text-[8px] font-black text-content-secondary/40 uppercase tracking-[0.25em]">Meta NPS</span>
              <span className="text-xl font-black text-plannera-orange leading-none tracking-tighter tabular-nums">{goal ?? '—'}</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-xl bg-plannera-orange/10 hover:bg-plannera-orange text-plannera-orange hover:text-white transition-all group-hover:scale-105 active:scale-90">
                  <Target className="w-3.5 h-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-surface-card border border-border-divider text-white max-w-sm rounded-2xl shadow-2xl p-0 overflow-hidden backdrop-blur-3xl">
                <div className="bg-gradient-to-r from-plannera-orange/40 to-black/40 p-8 border-b border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-plannera-orange" />
                  </div>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter">Meta Estratégica</DialogTitle>
                    <p className="text-[9px] font-black text-plannera-orange/60 uppercase tracking-widest">NPS Target Benchmark</p>
                  </DialogHeader>
                </div>
                <div className="p-10 space-y-8">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-content-secondary leading-relaxed opacity-70">Estabeleça o benchmark de satisfação desejado para este programa.</p>
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-plannera-orange rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition-opacity" />
                    <Input 
                      type="number" 
                      value={newGoalValue} 
                      onChange={e => setNewGoalValue(e.target.value)} 
                      placeholder="75" 
                      className="relative h-20 text-center text-5xl font-black rounded-2xl border-2 border-border-divider bg-surface-background shadow-inner focus-visible:ring-plannera-orange/20" 
                    />
                  </div>
                  <Button onClick={handleSetGoal} disabled={isUpdatingGoal} className="w-full h-16 bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black text-[11px] tracking-[0.3em] rounded-2xl shadow-xl shadow-plannera-orange/20 transition-all active:scale-[0.98] uppercase">
                    {isUpdatingGoal ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sincronizar Meta'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-10 border-border-divider text-emerald-500 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl px-5 shadow-sm transition-all active:scale-95 gap-2">
            <Globe className="w-4 h-4" /> Exportar
          </Button>

          <Link href="/nps/programs">
            <Button className="h-10 bg-plannera-primary hover:bg-plannera-primary/90 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl shadow-plannera-primary/10 transition-all active:scale-95">
              Gestão
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Card */}
      {loading ? (
        <div className="h-80 w-full animate-pulse bg-surface-card rounded-2xl border border-border-divider shadow-lg" />
      ) : stats ? (
        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-2xl bg-surface-card/80 backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-divider">

              {/* Section 1: Score Gauge */}
              <div className="lg:col-span-3 relative p-12 flex flex-col items-center justify-center bg-gradient-to-br from-plannera-primary/[0.05] to-transparent min-h-[300px]">
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
              <div className="lg:col-span-4 p-12 flex flex-col justify-center gap-12">
                <div className="grid grid-cols-2 gap-y-10">
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

                <div className="space-y-5 pt-10 border-t border-border-divider/50">
                  <ScoreBar label="Promotores" count={stats.promoters} total={stats.total_responses} color="bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                  <ScoreBar label="Neutros" count={stats.passives} total={stats.total_responses} color="bg-amber-400 opacity-50" />
                  <ScoreBar label="Detratores" count={stats.detractors} total={stats.total_responses} color="bg-destructive shadow-[0_0_20px_rgba(239,68,68,0.3)]" />
                </div>
              </div>

              {/* Section 3: Pareto Chart */}
              <div className="lg:col-span-5 p-12 flex flex-col space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-plannera-primary/10 border border-plannera-primary/20">
                      <Building2 className="w-5 h-5 text-plannera-primary" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-content-primary">Top Performers</h3>
                  </div>
                  <div className="flex bg-surface-background/50 p-2 rounded-2xl border border-border-divider shadow-inner">
                    {(['promoters', 'passives', 'detractors'] as const).map(s => (
                      <button key={s} onClick={() => setParetoSortBy(s)}
                        className={cn(
                          "w-6 h-6 rounded-xl transition-all m-1 flex items-center justify-center",
                          paretoSortBy === s
                            ? (s === 'promoters' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : s === 'passives' ? 'bg-amber-400 shadow-lg shadow-amber-400/20' : 'bg-destructive shadow-lg shadow-destructive/20')
                            : 'bg-transparent hover:bg-surface-card opacity-60 hover:opacity-100'
                        )} />
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
                          <div className={cn("text-sm font-black tracking-tighter tabular-nums", acc.score >= (goal ?? 75) ? 'text-emerald-500' : 'text-destructive')}>
                            {acc.score > 0 ? '+' : ''}{acc.score}
                          </div>
                        </div>
                        <div className="flex h-2.5 bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider">
                          {acc.p > 0 && <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(acc.p / acc.total) * 100}%` }} />}
                          {acc.n > 0 && <div className="bg-amber-400 h-full opacity-50 transition-all duration-1000" style={{ width: `${(acc.n / acc.total) * 100}%` }} />}
                          {acc.d > 0 && <div className="bg-destructive h-full transition-all duration-1000" style={{ width: `${(acc.d / acc.total) * 100}%` }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {paretoData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-border-divider rounded-2xl opacity-20">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Dados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Feed Area */}
      {!loading && responses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12">
          {responses.slice(0, 14).map((r: any, i: number) => {
            const seg = r.score !== null ? getNPSSegment(r.score) : null
            const segColor = seg === 'promoter' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : seg === 'passive' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-destructive border-destructive/20 bg-destructive/5'

            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedResponse(r)}
                className="flex items-stretch gap-8 p-8 rounded-2xl bg-surface-card border border-border-divider cursor-pointer hover:bg-surface-background hover:border-plannera-primary/30 transition-all group overflow-hidden relative shadow-lg shadow-black/5">

                {/* Score Indicator */}
                <div className={cn("flex flex-col items-center justify-center w-20 rounded-2xl border-2 font-black shrink-0 shadow-xl transition-all group-hover:scale-105 group-hover:rotate-2", segColor)}>
                  <span className="text-[8px] opacity-60 uppercase leading-none mb-1.5 font-black tracking-widest">Score</span>
                  <span className="text-3xl leading-none tracking-tighter tabular-nums">{r.score}</span>
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-content-primary text-[11px] font-black truncate group-hover:text-plannera-primary transition-all uppercase tracking-[0.1em]">{r.user_email || 'ANÔNIMO'}</span>
                    <span className="text-[9px] font-black text-content-secondary/30 ml-auto shrink-0 flex items-center gap-2 uppercase tracking-widest">
                      {r.responded_at ? new Date(r.responded_at).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>

                  <div className="px-5 py-3.5 rounded-2xl bg-surface-background/50 border border-border-divider shadow-inner group-hover:border-plannera-primary/20 transition-all">
                    <ResponseCarousel
                      ansList={r.comment ? [{ is_comment: true, text_value: r.comment }, ...(r.nps_answers || [])] : (r.nps_answers || [])}
                      scoreColor={seg === 'promoter' ? 'text-emerald-500' : seg === 'passive' ? 'text-amber-500' : 'text-destructive'}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Building2 className="w-3.5 h-3.5 text-content-secondary/20" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary/40 group-hover:text-plannera-primary/40 transition-colors truncate">{r.account_name}</p>
                  </div>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-10 transition-all duration-500 ease-out">
                  <div className="w-12 h-12 rounded-2xl bg-plannera-primary flex items-center justify-center shadow-2xl shadow-plannera-primary/30">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {!loading && responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-48 bg-surface-background/30 border-4 border-dashed border-border-divider/50 rounded-2xl opacity-20 grayscale mt-12">
          <div className="w-28 h-28 bg-surface-card rounded-2xl flex items-center justify-center mb-10 shadow-xl">
            <AlertTriangle className="w-14 h-14 text-content-secondary" />
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.5em] text-center max-w-md leading-relaxed">Horizonte sem dados para o período selecionado</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)}>
        <ResponseDetailDialog render={selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)} />
      </Dialog>
    </PageContainer>
  )
}
