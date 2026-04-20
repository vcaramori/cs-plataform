'use client'

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
      <span className="text-slate-400 text-[10px] font-black uppercase w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-white text-[10px] font-black w-8 text-right">{count}</span>
      <span className="text-slate-600 text-[9px] font-bold w-10 text-right">{pct}%</span>
    </div>
  )
}

function NPSGauge({ score, goal }: { score: number, goal: number | null }) {
  const g = goal ?? 75
  const c = Math.max(-100, Math.min(100, score))
  const isMet = c >= g
  const color = isMet ? 'text-emerald-400' : 'text-red-400'
  const label = isMet ? 'Meta OK' : 'Alerta'
  
  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div className={`text-6xl font-black tracking-tighter ${color} transition-transform group-hover:scale-105 duration-300`}>
        {c > 0 ? '+' : ''}{c}
      </div>
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 border ${isMet ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
        {isMet ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className="text-slate-600 text-[10px] font-bold uppercase tracking-wider mt-2 flex items-center gap-2">
        <span>NPS SCORE</span>
        <span className="opacity-20">|</span>
        <span className="text-slate-400">G: {g}</span>
      </div>
    </div>
  )
}

// ─── Modal de Detalhes ───────────────────────────────────────────────────────
function ResponseDetailDialog({ render, onOpenChange }: { render: any; onOpenChange: (open: boolean) => void }) {
  if (!render) return null

  const answers = render.nps_answers || []
  const seg = render.score !== null ? getNPSSegment(render.score) : null
  const segColor = seg === 'promoter' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : seg === 'passive' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'

  return (
    <DialogContent aria-describedby={undefined} className="bg-slate-950 border border-white/10 max-w-xl p-0 overflow-hidden">
      <div className="p-6 space-y-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <DialogTitle className="text-white font-black uppercase tracking-tight text-xl">Feedback Detalhado</DialogTitle>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{render.account_name}</p>
          </div>
          <Badge className={`text-[11px] font-black border uppercase px-3 py-1 ${segColor}`}>
            {seg || 'N/A'}
          </Badge>
        </DialogHeader>

        <div className="space-y-8 py-2">
          {/* Respondente */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Input type="hidden" /> {/* Fix for a focus trap error in some Radix versions */}
                <span className="text-white font-black">{render.user_email?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
              <div>
                <p className="text-white text-sm font-black">{render.user_email || 'Anônimo'}</p>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                  {render.responded_at ? new Date(render.responded_at).toLocaleString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[9px] font-black uppercase">Nota NPS</p>
              <p className={`text-2xl font-black ${segColor.split(' ')[0]}`}>{render.score}/10</p>
            </div>
          </div>

          {/* Respostas */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
               <AlignLeft className="w-3.5 h-3.5 text-orange-500" />
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Questionário</p>
            </div>
            
            {render.comment && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 relative">
                <div className="absolute top-3 right-3"><SmilePlus className="w-3 h-3 text-emerald-500/20" /></div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wide mb-1">Comentário Principal</p>
                <p className="text-white text-sm italic font-medium leading-relaxed">"{render.comment}"</p>
              </div>
            )}

            <div className="space-y-4">
              {answers.length === 0 && !render.comment ? (
                <p className="text-slate-600 text-xs text-center py-8 border border-dashed border-white/5 rounded-2xl">Dados detalhados indisponíveis.</p>
              ) : (
                answers.map((ans: any) => (
                  <div key={ans.id} className="space-y-2 p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-wide opacity-50">{ans.nps_questions?.title || 'Resposta'}</p>
                    <div className="text-white text-sm font-medium leading-relaxed">
                      {ans.nps_questions?.type === 'nps_scale' ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${(parseInt(ans.text_value)/10)*100}%` }} />
                          </div>
                          <span className="text-orange-400 font-black">{ans.text_value}/10</span>
                        </div>
                      ) : ans.nps_questions?.type === 'multiple_choice' ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(ans.selected_options || []).map((opt: string) => (
                            <Badge key={opt} variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/20 text-[10px] font-bold">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{ans.text_value || '—'}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white text-xs font-black uppercase">
          Fechar
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

  if (validAnswers.length === 0) return <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Sem comentários</p>

  const ans = validAnswers[idx]
  const qTitle = ans.is_comment ? 'Feedback' : (ans.nps_questions?.title || 'Resposta')
  const val = ans.is_comment ? ans.text_value : (ans.nps_questions?.type === 'multiple_choice' 
    ? (ans.selected_options || []).join(', ') 
    : ans.text_value)

  return (
    <div className="relative h-9 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
           className="absolute inset-0 flex flex-col justify-center">
          <span className={`text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5 ${scoreColor}`}>{qTitle}</span>
          <span className="text-slate-300 font-medium text-[11px] truncate leading-none" title={val}>{val}</span>
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
  const [paretoSortBy, setParetoSortBy] = useState<'promoters'|'passives'|'detractors'>('promoters')
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
    <div className="space-y-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-32 h-32 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
            <Star className="w-6 h-6 text-orange-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">NPS HUB</h1>
        </div>
        <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
          Inteligência de Atendimento <span className="opacity-30">/</span> Dashboards
          <Sparkles className="w-3.5 h-3.5 text-orange-500/40 animate-pulse" />
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.03] border border-white/5 p-4 rounded-3xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white text-[10px] font-black h-10 rounded-xl hover:bg-white/10 transition-all uppercase">
               <Bookmark className="w-3.5 h-3.5 text-orange-500/50 mr-2" />
               <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10">
              <SelectItem value="default" className="text-xs font-bold">DEFAULT (GLOBAL)</SelectItem>
              {programs.filter(p => p.is_active).map(p => (
                <SelectItem key={p.program_key} value={p.program_key} className="text-xs font-bold uppercase">{p.name || p.accounts?.name || 'PROGRAMA'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-[10px] font-black h-10 rounded-xl hover:bg-white/10 transition-all uppercase">
               <Building2 className="w-3.5 h-3.5 text-slate-500 mr-2" />
               <SelectValue placeholder="CONTAS" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10">
              <SelectItem value="all" className="text-xs font-bold uppercase">TODAS AS CONTAS</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs font-bold uppercase">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white text-[10px] font-black h-10 rounded-xl hover:bg-white/10 transition-all uppercase">
               <CalendarRange className="w-3.5 h-3.5 text-slate-500 mr-2" />
               <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10">
              {['7','30','90','180','365'].map(v => <SelectItem key={v} value={v} className="text-xs font-bold uppercase">{v} DIAS</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={fetchData} className="h-10 w-10 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-orange-500/[0.03] border border-orange-500/20">
             <div className="flex flex-col">
               <span className="text-[8px] text-slate-500 font-black uppercase leading-tight tracking-wider">Meta Atendimento</span>
               <span className="text-base font-black text-orange-400 leading-tight">{goal ?? '—'}</span>
             </div>
             <Dialog>
               <DialogTrigger asChild>
                 <button className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500/60 hover:text-orange-400 transition-colors">
                    <Target className="w-4 h-4" />
                 </button>
               </DialogTrigger>
               <DialogContent className="bg-slate-950 border-white/10 text-white max-w-sm rounded-3xl">
                 <DialogHeader><DialogTitle className="font-black uppercase italic tracking-tighter text-2xl">Ajustar Meta</DialogTitle></DialogHeader>
                 <div className="py-6 space-y-4">
                   <p className="text-slate-500 text-xs font-medium">Defina o NPS alvo corporativo para o período atual.</p>
                   <Input type="number" value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} placeholder="Ex: 75" className="bg-white/5 border-white/10 h-12 text-center text-xl font-black rounded-xl" />
                   <Button onClick={handleSetGoal} disabled={isUpdatingGoal} className="w-full h-12 bg-orange-600 hover:bg-orange-700 font-black uppercase rounded-xl shadow-lg shadow-orange-950/20">ATUALIZAR META</Button>
                 </div>
               </DialogContent>
             </Dialog>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-white/10 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl px-5">
            <Globe className="w-4 h-4 mr-2" /> Exportar
          </Button>
          
          <Link href="/nps/programs">
            <Button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] h-10 px-5 rounded-xl">
              Gerenciar
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Card */}
      {loading ? (
        <div className="h-80 w-full animate-pulse bg-white/5 rounded-3xl border border-white/5" />
      ) : stats ? (
        <Card className="bg-slate-950/50 border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
              
              {/* Section 1: Score Gauge */}
              <div className="lg:col-span-3 relative p-8 flex flex-col items-center justify-center bg-gradient-to-br from-white/[0.02] to-transparent min-h-[220px]">
                {/* Background Evolution Ghost */}
                <div className="absolute inset-x-0 bottom-0 top-1/2 opacity-[0.03] pointer-events-none">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="ghostGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="nps" stroke="none" fill="url(#ghostGradient)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="relative z-10"><NPSGauge score={stats.nps_score} goal={goal} /></div>
              </div>
              
              {/* Section 2: Core Metrics */}
              <div className="lg:col-span-4 p-8 flex flex-col justify-center gap-8">
                <div className="grid grid-cols-2 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] opacity-60">Volume</p>
                    <p className="text-3xl font-black text-white leading-none">{stats.total_responses}</p>
                  </div>
                  <div className="space-y-1 ml-4 border-l border-white/5 pl-4">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] opacity-60">Média</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-black text-yellow-500/80 leading-none">{stats.avg_score}</p>
                      <span className="text-[10px] font-bold text-slate-700">/10</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-6 border-t border-white/5">
                  <ScoreBar label="Promotores" count={stats.promoters}  total={stats.total_responses} color="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                  <ScoreBar label="Neutros"    count={stats.passives}   total={stats.total_responses} color="bg-yellow-500/60" />
                  <ScoreBar label="Detratores" count={stats.detractors} total={stats.total_responses} color="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                </div>
              </div>

              {/* Section 3: Pareto Chart */}
              <div className="lg:col-span-5 p-8 flex flex-col space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                     <Building2 className="w-4 h-4 text-orange-500/50" />
                     <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Pareto de Contas</p>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                    {(['promoters', 'passives', 'detractors'] as const).map(s => (
                      <button key={s} onClick={() => setParetoSortBy(s)}
                        className={`w-4 h-4 rounded-full transition-all m-0.5 ${paretoSortBy === s ? (s === 'promoters' ? 'bg-emerald-500' : s === 'passives' ? 'bg-yellow-500' : 'bg-red-500') : 'bg-transparent hover:bg-white/5'}`} />
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto pr-3 custom-scrollbar">
                  {[...paretoData].sort((a, b) => {
                    const valA = paretoSortBy === 'promoters' ? a.p : paretoSortBy === 'passives' ? a.n : a.d
                    const valB = paretoSortBy === 'promoters' ? b.p : paretoSortBy === 'passives' ? b.n : b.d
                    return valB - valA
                  }).slice(0, 8).map((acc, i) => (
                    <div key={acc.name} className="flex items-center gap-4 group">
                      <span className="w-4 text-[9px] font-black text-slate-700 italic">{i + 1}º</span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-300 text-[11px] font-black truncate group-hover:text-white transition-colors uppercase tracking-tight">{acc.name}</p>
                          <div className={`text-[11px] font-black ${acc.score >= (goal ?? 75) ? 'text-emerald-400' : 'text-red-400/80'}`}>
                            {acc.score > 0 ? '+' : ''}{acc.score}
                          </div>
                        </div>
                        <div className="flex h-1 bg-white/5 rounded-full overflow-hidden shadow-inner">
                          {acc.p > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(acc.p/acc.total)*100}%` }} />}
                          {acc.n > 0 && <div className="bg-yellow-500 h-full opacity-60" style={{ width: `${(acc.n/acc.total)*100}%` }} />}
                          {acc.d > 0 && <div className="bg-red-500 h-full" style={{ width: `${(acc.d/acc.total)*100}%` }} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {paretoData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center pt-8 border border-dashed border-white/5 rounded-2xl">
                       <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">Sem dados</p>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {responses.slice(0, 10).map((r: any, i: number) => {
            const seg = r.score !== null ? getNPSSegment(r.score) : null
            const segColor = seg === 'promoter' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : seg === 'passive' ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'
            
            return (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedResponse(r)}
                className="flex items-stretch gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/10 cursor-pointer hover:bg-white/[0.05] hover:border-white/20 transition-all group overflow-hidden relative">
                
                {/* Score Indicator */}
                <div className={`flex flex-col items-center justify-center w-14 rounded-2xl border ${segColor} font-black shrink-0 shadow-lg`}>
                  <span className="text-[8px] opacity-40 uppercase leading-none mb-1">Nota</span>
                  <span className="text-lg leading-none">{r.score}</span>
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-xs font-black truncate group-hover:text-orange-400 transition-colors uppercase tracking-tight">{r.user_email || 'ANÔNIMO'}</span>
                    <span className="text-slate-600 text-[10px] font-black ml-auto shrink-0 flex items-center gap-1.5 uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      {r.responded_at ? new Date(r.responded_at).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                  
                  <div className="px-3 py-1.5 rounded-xl bg-black/20 border border-white/5">
                    <ResponseCarousel 
                      ansList={r.comment ? [{ is_comment: true, text_value: r.comment }, ...(r.nps_answers || [])] : (r.nps_answers || [])} 
                      scoreColor={seg === 'promoter' ? 'text-emerald-400' : seg === 'passive' ? 'text-yellow-400' : 'text-red-400'}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide mt-2 truncate opacity-60 italic">{r.account_name}</p>
                </div>
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all pr-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-950/40">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {!loading && responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-dashed border-white/5 rounded-[3rem]">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-orange-500/20" />
          </div>
          <p className="text-slate-600 text-xs font-black uppercase tracking-[0.3em] italic">Vazio Cósmico <span className="opacity-30">/</span> Sem Dados</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)}>
        <ResponseDetailDialog render={selectedResponse} onOpenChange={open => !open && setSelectedResponse(null)} />
      </Dialog>
    </div>
  )
}
