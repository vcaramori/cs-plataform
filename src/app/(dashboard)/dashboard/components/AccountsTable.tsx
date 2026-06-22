'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table'
import { Search, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle, Building2, Pencil, BrainCircuit } from 'lucide-react'
import { useTableSort } from '@/hooks/useTableSort'
import type { Account, Contract } from '@/lib/supabase/types'
import type { Database } from '@/lib/supabase/database.types'

type RiskAssessmentRow = Database['public']['Tables']['account_risk_assessments']['Row']

import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { classifyHealth, isAtRiskScore } from '@/lib/health/classify'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type AccountWithContracts = Account & { 
  contracts: Contract[]
  discrepancy_alert?: boolean
  account_risk_assessments?: RiskAssessmentRow[]
}


function calculateAccountMetrics(account: AccountWithContracts) {
  const contracts = Array.isArray(account.contracts) ? account.contracts : (account.contracts ? [account.contracts] : [])
  const activeContracts = contracts.filter(c => c.status === 'active')
  const totalMRR = activeContracts.reduce((sum, c) => {
    const baseMrr = Number(c.mrr) || 0
    const discount = Number(c.discount_percentage) || 0
    return sum + (baseMrr * (1 - discount / 100))
  }, 0)
  const nearestRenewal = activeContracts
    .filter(c => c.renewal_date)
    .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())[0]

  return { activeContracts, totalMRR, nearestRenewal }
}

function HealthBadge({ score, isDiscrepant }: { score: number, isDiscrepant?: boolean }) {
  // Régua única (classifyHealth): saudável → verde, atenção → laranja, em risco/crítico → vermelho.
  const band = classifyHealth(score).band
  const color = band === 'saudavel' ? 'text-success' : band === 'atencao' ? 'text-primary' : 'text-destructive'
  const bg = band === 'saudavel' ? 'bg-success/10' : band === 'atencao' ? 'bg-primary/10' : 'bg-destructive/10'
  const ring = band === 'saudavel' ? 'ring-emerald-500/20' : band === 'atencao' ? 'ring-primary/20' : 'ring-destructive/20'

  return (
    <div className="flex items-center gap-2">
      <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-extrabold ring-1 ring-inset inline-flex items-center relative", color, bg, ring)}>
        {score}
      </div>
      {isDiscrepant && (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-3 h-3 text-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-border text-foreground">
              <p className="text-[10px] font-bold uppercase tracking-tight">Discrepância Detectada vs IA ({'>'} 20p)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  const trends: any = {
    up: <TrendingUp className="w-4 h-4 text-success" />,
    down: <TrendingDown className="w-4 h-4 text-destructive" />,
    critical: <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />
  }
  return trends[trend] || trends.stable
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    'Indústria': 'bg-teal-500 text-white dark:bg-teal-500/20 dark:text-teal-500 border-teal-500/20',
    'MRO': 'bg-amber-500 text-white dark:bg-amber-500/20 dark:text-amber-500 border-amber-500/20',
    'Varejo': 'bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-500 border-rose-500/20',

  }
  return <Badge variant="outline" className={cn("text-[11px] uppercase font-extrabold tracking-widest px-3 py-1 border shadow-sm", colors[segment] ?? '')}>{segment}</Badge>
}

export function AccountsTable({ accounts }: { accounts: AccountWithContracts[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')

  // Filtro/ordenação vêm da URL — drill-down dos KPIs do dashboard/home.
  const activeFilter = searchParams.get('filter')   // at-risk | health-low | renewals
  const activeSort = searchParams.get('sort')        // mrr
  const hasUrlScope = !!activeFilter || !!activeSort

  const matchesUrlFilter = (a: AccountWithContracts): boolean => {
    if (!activeFilter) return true
    // Régua única: "em risco" = health manual < 50 (IA é advisory, não filtra aqui).
    if (activeFilter === 'at-risk') return isAtRiskScore(a.health_score)
    if (activeFilter === 'health-low') return isAtRiskScore(a.health_score)
    if (activeFilter === 'renewals') {
      const in90 = Date.now() + 90 * 24 * 60 * 60 * 1000
      const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
      return contracts.some(c => c.status === 'active' && c.renewal_date && new Date(c.renewal_date).getTime() <= in90)
    }
    return true
  }

  const filtered = accounts
    .filter(a => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
      const matchSegment = segmentFilter === 'all' || a.segment === segmentFilter
      return matchSearch && matchSegment && matchesUrlFilter(a)
    })
    .map(a => {
      const metrics = calculateAccountMetrics(a)
      return {
        ...a,
        _computed_mrr: metrics.totalMRR,
        _computed_active_contracts: metrics.activeContracts.length,
        _computed_renewal: metrics.nearestRenewal?.renewal_date ? new Date(metrics.nearestRenewal.renewal_date).getTime() : 0,
        _metrics: metrics // pass it along so we don't recalculate in render
      }
    })

  const defaultSortKey = activeSort === 'mrr' ? '_computed_mrr' : null
  const defaultSortDirection = activeSort === 'mrr' ? 'desc' : null

  const { sortedData, requestSort, sortConfig } = useTableSort(filtered, {
    key: defaultSortKey,
    direction: defaultSortDirection
  })

  const FILTER_LABELS: Record<string, string> = {
    'at-risk': 'Em risco',
    'health-low': 'Health em risco (<50)',
    'renewals': 'Renovações ≤ 90d',
  }
  const scopeLabel = activeFilter
    ? FILTER_LABELS[activeFilter] ?? activeFilter
    : activeSort === 'mrr' ? 'Maior MRR' : null

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-heading font-extrabold uppercase tracking-tight">Portfólio de LOGOS</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest">{filtered.length} Clientes Encontrados</p>
                {scopeLabel && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                    {scopeLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary group-focus-within:text-content-primary transition-colors" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-72 h-11 rounded-xl"
                />
                { (search || hasUrlScope || segmentFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setSegmentFilter('all')
                      router.push('/dashboard')
                    }}
                    className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all ml-2"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>

              <div className="flex bg-surface-background p-1 rounded-xl border border-border-divider">
                {['all', 'Indústria', 'MRO', 'Varejo'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSegmentFilter(s)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all",
                      segmentFilter === s
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-content-secondary hover:text-content-primary"
                    )}
                  >
                    {s === 'all' ? 'Tudo' : s}
                  </button>
                ))}
              </div>

              <Link href="/accounts/new">
                <Button className="px-6 gap-2 rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all">
                  <Plus className="w-4 h-4" />
                  <span>Novo LOGO</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t border-border-divider">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-12"></TableHead>
                  <SortableTableHead sortKey="name" currentSort={sortConfig} onSort={requestSort} className="text-[11px]">Cliente</SortableTableHead>
                  <SortableTableHead sortKey="industry" currentSort={sortConfig} onSort={requestSort} className="text-[11px]">Indústria</SortableTableHead>
                  <SortableTableHead sortKey="segment" currentSort={sortConfig} onSort={requestSort} className="text-[11px]">Segmento</SortableTableHead>
                  <SortableTableHead sortKey="_computed_mrr" currentSort={sortConfig} onSort={requestSort} className="text-right text-[11px]">MRR</SortableTableHead>
                  <SortableTableHead sortKey="_computed_active_contracts" currentSort={sortConfig} onSort={requestSort} className="text-center text-[11px]">Qtd</SortableTableHead>
                  <SortableTableHead sortKey="_computed_renewal" currentSort={sortConfig} onSort={requestSort} className="text-[11px]">Renovação</SortableTableHead>
                  <SortableTableHead sortKey="health_score" currentSort={sortConfig} onSort={requestSort} className="text-center text-[11px]">Saúde</SortableTableHead>
                  <SortableTableHead sortKey="health_trend" currentSort={sortConfig} onSort={requestSort} className="text-center pr-6 text-[11px]">Trend</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode='popLayout'>
                  {sortedData.map((account, index) => {
                    const { activeContracts, totalMRR, nearestRenewal } = account._metrics

                    return (
                      <motion.tr
                        key={account.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        onClick={() => router.push(`/accounts/${account.id}`)}
                        className="group border-b border-border-divider hover:bg-muted/40 transition-all cursor-pointer"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-background border border-border-divider flex items-center justify-center text-content-primary font-extrabold shadow-sm group-hover:scale-105 transition-transform">
                            {account.name.charAt(0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="text-content-primary font-extrabold text-[13px] tracking-tight transition-colors uppercase">{account.name}</p>
                            {(() => {
                              const riskAssessments = Array.isArray(account.account_risk_assessments) 
                                ? account.account_risk_assessments 
                                : (account.account_risk_assessments ? [account.account_risk_assessments] : []);
                              const latestRisk = riskAssessments.sort((a: RiskAssessmentRow, b: RiskAssessmentRow) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];

                              
                              if (latestRisk && (latestRisk.sentiment_label === 'at-risk' || latestRisk.sentiment_label === 'negative')) {
                                return (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger>
                                        <Badge variant="neutral" className="bg-destructive/10 text-destructive border-destructive/20 h-5 px-1.5 flex items-center gap-1 cursor-help">
                                          {latestRisk.sentiment_label === 'at-risk' ? <AlertTriangle className="w-3 h-3" /> : <BrainCircuit className="w-3 h-3" />}
                                          <span className="text-[9px] uppercase font-black">AI Risk</span>
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-card border-border text-foreground">
                                        <p className="text-[10px] font-bold uppercase tracking-tight">Risco Detectado ({latestRisk.risk_score})</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-content-secondary text-[11px] font-extrabold uppercase tracking-widest">{account.industry || 'Global'}</p>
                        </TableCell>
                        <TableCell><SegmentBadge segment={account.segment} /></TableCell>
                        <TableCell className="text-right">
                          <span className="text-content-primary font-extrabold text-[11px]">
                            {totalMRR > 0 ? formatCurrency(totalMRR) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-content-secondary font-extrabold text-[11px]">
                            {activeContracts.length}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-content-secondary font-extrabold text-[11px]">
                              {nearestRenewal?.renewal_date
                                ? new Date(nearestRenewal.renewal_date).toLocaleDateString('pt-BR')
                                : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center group/health">
                          <div className="flex items-center justify-center gap-3">
                            <HealthBadge score={account.health_score} isDiscrepant={account.discrepancy_alert} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 rounded-lg opacity-0 group-hover/health:opacity-100 hover:bg-accent text-muted-foreground hover:text-primary transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/accounts/${account.id}/edit`);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-6"><TrendIcon trend={account.health_trend} /></TableCell>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-surface-background rounded-b-3xl border-t border-border-divider">
              <Building2 className="w-12 h-12 text-content-secondary/30 mx-auto mb-4" />
              <p className="text-content-secondary font-extrabold uppercase text-xs tracking-widest">Nenhum cliente mapeado nesta busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
