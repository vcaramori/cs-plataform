'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Bookmark, Building2, CalendarRange, RefreshCw, Target, Loader2, Globe } from 'lucide-react'
import Link from 'next/link'

interface NPSFiltersProps {
  programFilter: string
  onProgramChange: (value: string) => void
  accountFilter: string
  onAccountChange: (value: string) => void
  periodDays: string
  onPeriodChange: (value: string) => void
  goal: number | null
  newGoalValue: string
  onGoalValueChange: (value: string) => void
  isUpdatingGoal: boolean
  onSetGoal: () => void
  onExport: () => void
  onRefresh: () => void
  isLoading: boolean
  programs: any[]
  accounts: { id: string; name: string }[]
}

export function NPSFilters({
  programFilter,
  onProgramChange,
  accountFilter,
  onAccountChange,
  periodDays,
  onPeriodChange,
  goal,
  newGoalValue,
  onGoalValueChange,
  isUpdatingGoal,
  onSetGoal,
  onExport,
  onRefresh,
  isLoading,
  programs,
  accounts,
}: NPSFiltersProps) {
  return (
    <div className="flex flex-col gap-3 bg-surface-card border border-border-divider p-4 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-plannera-orange/60" />

      <div className="flex flex-wrap items-center gap-3 pl-2">
        <Select value={programFilter} onValueChange={onProgramChange}>
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

        <Select value={accountFilter} onValueChange={onAccountChange}>
          <SelectTrigger className="w-44 text-content-primary text-[10px] font-black h-10 rounded-2xl bg-surface-background/50 border-border-divider hover:bg-surface-background transition-all shadow-sm uppercase tracking-widest">
            <Building2 className="w-4 h-4 text-content-secondary/40 mr-2" />
            <SelectValue placeholder="CONTAS" />
          </SelectTrigger>
          <SelectContent className="bg-surface-card border-border-divider rounded-2xl">
            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">TODAS AS CONTAS</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px] font-black uppercase tracking-widest">{a.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={periodDays} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-36 text-content-primary text-[10px] font-black h-10 rounded-2xl bg-surface-background/50 border-border-divider hover:bg-surface-background transition-all shadow-sm uppercase tracking-widest">
            <CalendarRange className="w-4 h-4 text-content-secondary/40 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-card border-border-divider rounded-2xl">
            {['7', '30', '90', '180', '365'].map(v => <SelectItem key={v} value={v} className="text-[10px] font-black uppercase tracking-widest">{v} DIAS</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={onRefresh} className="h-10 w-10 text-content-secondary/40 hover:text-plannera-primary bg-surface-background/50 rounded-2xl border border-border-divider shadow-sm transition-all active:scale-90">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pl-2 pt-1 border-t border-border-divider/50">
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
                    onChange={e => onGoalValueChange(e.target.value)}
                    placeholder="75"
                    className="relative h-20 text-center text-5xl font-black rounded-2xl border-2 border-border-divider bg-surface-background shadow-inner focus-visible:ring-plannera-orange/20"
                  />
                </div>
                <Button onClick={onSetGoal} disabled={isUpdatingGoal} className="w-full h-16 bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black text-[11px] tracking-[0.3em] rounded-2xl shadow-xl shadow-plannera-orange/20 transition-all active:scale-[0.98] uppercase">
                  {isUpdatingGoal ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sincronizar Meta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={onExport} className="h-10 border-border-divider text-success hover:bg-success hover:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl px-5 shadow-sm transition-all active:scale-95 gap-2">
          <Globe className="w-4 h-4" /> Exportar
        </Button>

        <Link href="/nps/programs">
          <Button className="h-10 bg-plannera-primary hover:bg-plannera-primary/90 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl shadow-plannera-primary/10 transition-all active:scale-95">
            Gestão
          </Button>
        </Link>
      </div>
    </div>
  )
}
