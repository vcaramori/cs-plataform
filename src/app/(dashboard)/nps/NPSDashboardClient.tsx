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
  CalendarRange, Globe, Target, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react'
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
      <span className="text-content-primary text-[10px] font-black w-8 text-right">{count}</span>
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
      <div className={`text-6xl font-black tracking-tighter ${color} transition-transform group-hover:scale-105 duration-300`}>
        {c > 0 ? '+' : ''}{c}
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-surface-card border border-border-divider shadow-sm">
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
          <Badge className={`text-[10px] font-black border uppercase px-3 py-1 rounded-xl shadow-sm ${segColor}`}>
            {seg || 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="space-y-8 py-2">
          {/* Respondente */}
          <div className="flex items-center justify-between bg-surface-background p-4 rounded-2xl border border-border-divider">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
                <Input type="hidden" />
                <span className="text-content-primary font-black text-xl">{render.user_email?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
              <div>
                <p className="text-content-primary text-sm font-black tracking-tight">{render.user_email || 'Anônimo'}</p>
                <p className="label-premium !text-[9px] opacity-50 lowercase tracking-tight font-medium">
                  {render.responded_at ? new Date(render.responded_at).toLocaleString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="label-premium !text-[9px]">Nota NPS</p>
              <p className={`text-3xl font-black tracking-tighter ${segColor.split(' ')[0]}`}>{render.score}<span className="text-xs opacity-30">/10</span></p>
            </div>
          </div>

          {/* Respostas */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-4 h-4 text-primary" />
              <p className="label-premium">Análise do Questionário</p>
            </div>

            {render.comment && (
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <p className="label-premium opacity-60 mb-1">Comentário Estruturado</p>
                <p className="text-foreground text-sm italic font-medium leading-relaxed tracking-tight">"{render.comment}"</p>
              </div>
            )}

            <div className="space-y-4">
              {answers.length === 0 && !render.comment ? (
                <div className="py-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center opacity-30">
                  <p className="label-premium">Sem dados detalhados</p>
                </div>
              ) : (
                answers.map((ans: any) => (
                  <div key={ans.id} className="space-y-2 p-5 rounded-3xl bg-surface-card border border-border-divider hover:bg-surface-background transition-all group">
                    <p className="label-premium !text-[9px] opacity-40 group-hover:opacity-100 transition-opacity">{ans.nps_questions?.title || 'Componente do Feedback'}</p>
                    <div className="text-content-primary text-sm font-black tracking-tight leading-relaxed">
                      {ans.nps_questions?.type === 'nps_scale' ? (
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 bg-surface-background rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-primary" style={{ width: `${(parseInt(ans.text_value) / 10) * 100}%` }} />
                          </div>
                          <span className="text-primary font-black tracking-tighter">{ans.text_value}<span className="text-[10px] opacity-30">/10</span></span>
                        </div>
                      ) : ans.nps_questions?.type === 'multiple_choice' ? (
                        <div className="flex flex-wrap gap-2">
                          {(ans.selected_options || []).map((opt: string) => (
                            <Badge key={opt} variant="neutral" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3">
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

  if (validAnswers.length === 0) return <p className="label-premium opacity-30 italic">Sem comentários registrados</p>

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
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <h1 className="h1-page">NPS Research Control</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Inteligência de Atendimento, Pesquisas Relacionais e Feedback Estruturado
          <Sparkles className="w-3.5 h-3.5 text-primary/40 animate-pulse" />
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-card border border-border-divider p-5 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-56 text-foreground text-[10px] font-black h-11 rounded-xl hover:bg-accent/50 transition-all shadow-sm">
              <Bookmark className="w-3.5 h-3.5 text-primary/50 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border rounded-xl">
              <SelectItem value="default" className="text-[10px] font-black uppercase">GLOBAL PORTFOLIO</SelectItem>
              {programs.filter(p => p.is_active).map(p => (
                <SelectItem key={p.program_key} value={p.program_key} className="text-[10px] font-black uppercase">{p.name || p.accounts?.name || 'PROGRAM'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-48 text-foreground text-[10px] font-black h-11 rounded-xl hover:bg-accent/50 transition-all shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground mr-2" />
              <SelectValue placeholder="CONTAS" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border rounded-xl">
              <SelectItem value="all" className="text-[10px] font-black uppercase">TODAS AS CONTAS</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px] font-black uppercase">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-44 text-foreground text-[10px] font-black h-11 rounded-xl hover:bg-accent/50 transition-all shadow-sm">
              <CalendarRange className="w-3.5 h-3.5 text-muted-foreground mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border rounded-xl">
              {['7', '30', '90', '180', '365'].map(v => <SelectItem key={v} value={v} className="text-[10px] font-black uppercase">{v} DIAS</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-11 w-11 text-muted-foreground hover:text-primary bg-background rounded-xl border border-border-divider shadow-sm transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-5 px-5 py-2.5 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm">
            <div className="flex flex-col">
              <span className="label-premium !text-[8px] opacity-60 leading-tight">Meta Portfólio</span>
              <span className="text-xl font-black text-primary leading-none tracking-tighter">{goal ?? '—'}</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all shadow-sm">
                  <Target className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border text-foreground max-w-sm rounded-2xl shadow-2xl">
                <DialogHeader><DialogTitle className="h2-section !text-2xl !text-foreground">Definir Meta NPS</DialogTitle></DialogHeader>
                <div className="py-6 space-y-6">
                  <p className="label-premium normal-case opacity-60 font-medium">Estabeleça o benchmark de satisfação desejado para este programa ou período.</p>
                  <Input type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} placeholder="Ex: 75" className="h-14 text-center text-3xl font-black rounded-2xl shadow-sm" />
                  <Button onClick={handleSetGoal} disabled={isUpdatingGoal} className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-2xl shadow-xl">ATUALIZAR TARGET</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-emerald-500 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-6 shadow-sm">
            <Globe className="w-4 h-4 mr-2" /> Exportar Dados
          </Button>

          <Link href="/nps/programs">
            <Button variant="premium" className="text-[10px] font-black uppercase tracking-widest px-6 rounded-xl shadow-lg">
              Configurar
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Card */}
      {loading ? (
        <div className="h-80 w-full animate-pulse bg-surface-card rounded-2xl border border-border-divider" />
      ) : stats ? (
        <Card variant="glass" className="border-border rounded-2xl overflow-hidden shadow-2xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-divider">

              {/* Section 1: Score Gauge */}
              <div className="lg:col-span-3 relative p-10 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-transparent min-h-[260px]">
                <div className="absolute inset-x-0 bottom-0 top-1/2 opacity-[0.05] pointer-events-none">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <Area type="monotone" dataKey="nps" stroke="none" fill="var(--primary)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="relative z-10"><NPSGauge score={stats.nps_score} goal={goal} /></div>
              </div>

              {/* Section 2: Core Metrics */}
              <div className="lg:col-span-4 p-10 flex flex-col justify-center gap-10">
                <div className="grid grid-cols-2 gap-y-8">
                  <div className="space-y-2">
                    <p className="label-premium opacity-50">Volume Total</p>
                    <p className="text-4xl font-black text-foreground tracking-tighter leading-none">{stats.total_responses}</p>
                  </div>
                  <div className="space-y-2 ml-4 border-l border-border-divider pl-6">
                    <p className="label-premium opacity-50">Média Global</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-black text-primary tracking-tighter leading-none">{stats.avg_score}</p>
                      <span className="text-xs font-black text-muted-foreground/30">/10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-border-divider">
                  <ScoreBar label="Promotores" count={stats.promoters} total={stats.total_responses} color="bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                  <ScoreBar label="Neutros" count={stats.passives} total={stats.total_responses} color="bg-amber-400 opacity-60" />
                  <ScoreBar label="Detratores" count={stats.detractors} total={stats.total_responses} color="bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                </div>
              </div>

              {/* Section 3: Pareto Chart */}
              <div className="lg:col-span-5 p-10 flex flex-col space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary/50" />
                    <h3 className="h2-section">Distribuição por Contas</h3>
                  </div>
                  <div className="flex bg-surface-background p-1.5 rounded-2xl border border-border-divider shadow-inner">
                    {(['promoters', 'passives', 'detractors'] as const).map(s => (
                      <button key={s} onClick={() => setParetoSortBy(s)}
                        className={cn(
                          "w-5 h-5 rounded-xl transition-all m-0.5",
                          paretoSortBy === s
                            ? (s === 'promoters' ? 'bg-emerald-500' : s === 'passives' ? 'bg-amber-400' : 'bg-destructive')
                            : 'bg-transparent hover:bg-surface-card'
                        )} />
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-4 max-h-[220px] overflow-y-auto pr-4 custom-scrollbar">
                  {[...paretoData].sort((a, b) => {
                    const valA = paretoSortBy === 'promoters' ? a.p : paretoSortBy === 'passives' ? a.n : a.d
                    const valB = paretoSortBy === 'promoters' ? b.p : paretoSortBy === 'passives' ? b.n : b.d
                    return valB - valA
                  }).slice(0, 10).map((acc, i) => (
                    <div key={acc.name} className="flex items-center gap-5 group">
                      <span className="w-5 text-[10px] font-black text-content-secondary/30 italic tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-content-primary text-xs font-black truncate group-hover:text-primary transition-all uppercase tracking-tight">{acc.name}</p>
                          <div className={cn("text-xs font-black tracking-tighter tabular-nums", acc.score >= (goal ?? 75) ? 'text-emerald-500' : 'text-destructive/80')}>
                            {acc.score > 0 ? '+' : ''}{acc.score}
                          </div>
                        </div>
                        <div className="flex h-2 bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider">
                          {acc.p > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(acc.p / acc.total) * 100}%` }} />}
                          {acc.n > 0 && <div className="bg-amber-400 h-full opacity-60" style={{ width: `${(acc.n / acc.total) * 100}%` }} />}
                          {acc.d > 0 && <div className="bg-destructive h-full" style={{ width: `${(acc.d / acc.total) * 100}%` }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {paretoData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-border-divider rounded-3xl opacity-20">
                      <p className="label-premium">Sem dados computados</p>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {responses.slice(0, 12).map((r: any, i: number) => {
            const seg = r.score !== null ? getNPSSegment(r.score) : null
            const segColor = seg === 'promoter' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : seg === 'passive' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-destructive border-destructive/20 bg-destructive/5'

            return (
              <motion.div key={r.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedResponse(r)}
                className="flex items-stretch gap-6 p-6 rounded-2xl bg-surface-card border border-border-divider cursor-pointer hover:bg-surface-background hover:border-primary/30 transition-all group overflow-hidden relative shadow-sm">

                {/* Score Indicator */}
                <div className={cn("flex flex-col items-center justify-center w-16 rounded-xl border font-black shrink-0 shadow-lg transition-transform group-hover:scale-105", segColor)}>
                  <span className="text-[9px] opacity-40 uppercase leading-none mb-1 font-black">Score</span>
                  <span className="text-2xl leading-none tracking-tighter">{r.score}</span>
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-content-primary text-sm font-black truncate group-hover:text-primary transition-all uppercase tracking-tight">{r.user_email || 'ANÔNIMO'}</span>
                    <span className="label-premium !text-[9px] ml-auto shrink-0 flex items-center gap-2 opacity-50">
                      {r.responded_at ? new Date(r.responded_at).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>

                  <div className="px-4 py-2.5 rounded-2xl bg-surface-background border border-border-divider shadow-inner group-hover:border-primary/20 transition-all">
                    <ResponseCarousel
                      ansList={r.comment ? [{ is_comment: true, text_value: r.comment }, ...(r.nps_answers || [])] : (r.nps_answers || [])}
                      scoreColor={seg === 'promoter' ? 'text-emerald-500' : seg === 'passive' ? 'text-amber-500' : 'text-destructive'}
                    />
                  </div>
                  <p className="label-premium !text-[9px] mt-3 opacity-40 group-hover:opacity-100 transition-opacity truncate font-medium">{r.account_name}</p>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-6 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {!loading && responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-background border-2 border-dashed border-border-divider rounded-2xl opacity-30">
          <div className="w-24 h-24 bg-surface-card rounded-full flex items-center justify-center mb-8">
            <AlertTriangle className="w-12 h-12 text-content-secondary" />
          </div>
          <p className="label-premium !text-sm">Horizonte sem dados para o período selecionado</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)}>
        <ResponseDetailDialog render={selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)} />
      </Dialog>
    </PageContainer>
  )
}
