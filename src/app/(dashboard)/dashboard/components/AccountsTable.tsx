'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle, Building2, Pencil } from 'lucide-react'
import type { Account, Contract } from '@/lib/supabase/types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type AccountWithContracts = Account & { contracts: Contract[], discrepancy_alert?: boolean }

function HealthBadge({ score, isDiscrepant }: { score: number, isDiscrepant?: boolean }) {
  const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-primary' : 'text-destructive'
  const bg = score >= 70 ? 'bg-emerald-500/10' : score >= 40 ? 'bg-primary/10' : 'bg-destructive/10'
  const ring = score >= 70 ? 'ring-emerald-500/20' : score >= 40 ? 'ring-primary/20' : 'ring-destructive/20'

  return (
    <div className="flex items-center gap-2">
      <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-black ring-1 ring-inset inline-flex items-center relative", color, bg, ring)}>
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
    up: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    down: <TrendingDown className="w-4 h-4 text-destructive" />,
    critical: <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />
  }
  return trends[trend] || trends.stable
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    'Indústria': 'bg-[#2ba09d] text-white dark:bg-[#2ba09d]/20 dark:text-[#2ba09d] border-[#2ba09d]/20',
    'MRO': 'bg-[#f8b967] text-[#8a5a15] border-[#f8b967]/20 dark:bg-[#f8b967]/20 dark:text-[#f8b967]',
    'Varejo': 'bg-[#d85d4b] text-white border-[#d85d4b]/20 dark:bg-[#d85d4b]/20 dark:text-[#d85d4b]',
  }
  return <Badge variant="outline" className={cn("text-[11px] uppercase font-black tracking-widest px-3 py-1 border shadow-sm", colors[segment] ?? '')}>{segment}</Badge>
}

export function AccountsTable({ accounts }: { accounts: AccountWithContracts[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const filtered = accounts.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchSegment = segmentFilter === 'all' || a.segment === segmentFilter
    return matchSearch && matchSegment
  })

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-heading font-black uppercase tracking-tight">Portfólio de LOGOS</CardTitle>
              <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest">{filtered.length} Clientes Encontrados</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary group-focus-within:text-content-primary transition-colors" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 w-72 h-11 rounded-xl"
                />
              </div>

              <div className="flex bg-surface-background p-1 rounded-xl border border-border-divider">
                {['all', 'Indústria', 'MRO', 'Varejo'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSegmentFilter(s)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
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
                  <TableHead className="text-[11px]">Cliente</TableHead>
                  <TableHead className="text-[11px]">Indústria</TableHead>
                  <TableHead className="text-[11px]">Segmento</TableHead>
                  <TableHead className="text-right text-[11px]">MRR</TableHead>
                  <TableHead className="text-center text-[11px]">Qtd</TableHead>
                  <TableHead className="text-[11px]">Renovação</TableHead>
                  <TableHead className="text-center text-[11px]">Saúde</TableHead>
                  <TableHead className="text-center pr-6 text-[11px]">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode='popLayout'>
                  {filtered.map((account, index) => {
                    const contracts = Array.isArray(account.contracts) ? account.contracts : (account.contracts ? [account.contracts] : [])
                    const activeContracts = contracts.filter(c => c.status === 'active')
                    const totalMRR = activeContracts.reduce((sum, c) => {
                      const baseMrr = Number(c.mrr) || 0;
                      const discount = Number(c.discount_percentage) || 0;
                      return sum + (baseMrr * (1 - discount / 100));
                    }, 0)
                    const nearestRenewal = activeContracts
                      .filter(c => c.renewal_date)
                      .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())[0]

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
                          <div className="w-10 h-10 rounded-xl bg-surface-background border border-border-divider flex items-center justify-center text-content-primary font-black shadow-sm group-hover:scale-105 transition-transform">
                            {account.name.charAt(0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-content-primary font-black text-[13px] tracking-tight transition-colors uppercase">{account.name}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-content-secondary text-[11px] font-black uppercase tracking-widest">{account.industry || 'Global'}</p>
                        </TableCell>
                        <TableCell><SegmentBadge segment={account.segment} /></TableCell>
                        <TableCell className="text-right">
                          <span className="text-content-primary font-black text-[11px]">
                            {totalMRR > 0 ? formatCurrency(totalMRR) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-content-secondary font-black text-[11px]">
                            {activeContracts.length}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-content-secondary font-black text-[11px]">
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
              <p className="text-content-secondary font-black uppercase text-xs tracking-widest">Nenhum cliente mapeado nesta busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
