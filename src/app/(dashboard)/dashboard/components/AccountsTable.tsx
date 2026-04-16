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
import { HealthScoreEditModal } from './HealthScoreEditModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type AccountWithContracts = Account & { contracts: Contract[], discrepancy_alert?: boolean }

function HealthBadge({ score, isDiscrepant }: { score: number, isDiscrepant?: boolean }) {
  const color = score >= 70 ? 'text-plannera-ds' : score >= 40 ? 'text-plannera-orange' : 'text-plannera-demand'
  const bg = score >= 70 ? 'bg-plannera-ds/10' : score >= 40 ? 'bg-plannera-orange/10' : 'bg-plannera-demand/10'
  const ring = score >= 70 ? 'ring-plannera-ds/20' : score >= 40 ? 'ring-plannera-orange/20' : 'ring-plannera-demand/20'
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset inline-flex items-center relative", color, bg, ring)}>
        {score}
      </div>
      {isDiscrepant && (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <div className="w-5 h-5 rounded-full bg-plannera-orange/10 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-3 h-3 text-plannera-orange" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-white/10 text-white">
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
    up: <TrendingUp className="w-4 h-4 text-plannera-ds" />,
    down: <TrendingDown className="w-4 h-4 text-plannera-demand" />,
    critical: <AlertTriangle className="w-4 h-4 text-plannera-demand animate-pulse" />,
    stable: <Minus className="w-4 h-4 text-slate-500" />
  }
  return trends[trend] || trends.stable
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    Enterprise: 'bg-plannera-sop/10 text-plannera-sop border-plannera-sop/20',
    'Mid-Market': 'bg-plannera-operations/10 text-plannera-operations border-plannera-operations/20',
    SMB: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 border", colors[segment] ?? '')}>{segment}</Badge>
}

export function AccountsTable({ accounts }: { accounts: AccountWithContracts[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const filtered = accounts.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchSegment = segmentFilter === 'all' || a.segment === segmentFilter
    return matchSearch && matchSegment
  })

  return (
    <>
      <Card className="glass-card shadow-2xl border-none">
        <CardHeader className="pb-6 px-10 pt-10">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="space-y-1">
              <CardTitle className="text-white text-xl font-heading font-bold uppercase tracking-tight">Portfólio de LOGOS</CardTitle>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{filtered.length} Clientes Encontrados</p>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-plannera-sop transition-colors" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 w-64 bg-black/20 border-white/5 text-white placeholder:text-slate-600 focus-visible:ring-plannera-sop h-10 rounded-xl"
                />
              </div>

              <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                {['all', 'SMB', 'Mid-Market', 'Enterprise'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSegmentFilter(s)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                      segmentFilter === s 
                        ? "bg-plannera-sop text-white shadow-lg" 
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    {s === 'all' ? 'Tudo' : s}
                  </button>
                ))}
              </div>

              <Link href="/accounts/new">
                <Button className={cn(
                  "h-9 rounded-lg px-4 gap-2 font-bold uppercase tracking-widest text-[10px] transition-all duration-300",
                  "bg-gradient-to-br from-plannera-orange to-[#f59e0b] text-white",
                  "shadow-[0_2px_10px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_15px_rgba(245,158,11,0.3)]",
                  "hover:scale-[1.02] active:scale-[0.98] border-none",
                  "relative overflow-hidden group"
                )}>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Plus className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Novo LOGO</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 border-t border-white/5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent px-10">
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px] pl-10">Cliente</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Segmento</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px] text-right pr-10">Financial (MRR)</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Renovação</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px] text-center">Saúde</TableHead>
                  <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[9px] text-center pr-10">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode='popLayout'>
                  {filtered.map((account, index) => {
                    const contracts = Array.isArray(account.contracts) ? account.contracts : (account.contracts ? [account.contracts] : [])
                    const activeContracts = contracts.filter(c => c.status === 'active')
                    const totalMRR = activeContracts.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)
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
                        className="group border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <TableCell className="pl-10">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20 flex items-center justify-center text-plannera-sop font-bold shadow-lg">
                              {account.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm tracking-tight group-hover:text-plannera-orange transition-colors uppercase">{account.name}</p>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{account.industry || 'Global'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><SegmentBadge segment={account.segment} /></TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex flex-col items-end">
                            <span className="text-white text-sm font-bold tracking-tight">
                              {totalMRR > 0 ? formatCurrency(totalMRR) : '—'}
                            </span>
                            <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                              {activeContracts.length} {activeContracts.length === 1 ? 'Produto' : 'Produtos'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300 text-xs font-bold font-mono">
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
                              className="w-8 h-8 rounded-lg opacity-0 group-hover/health:opacity-100 hover:bg-white/5 text-slate-500 hover:text-plannera-orange transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(account);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center pr-10"><TrendIcon trend={account.health_trend} /></TableCell>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-black/5 rounded-b-3xl border-t border-white/5">
                <Building2 className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Nenhum cliente mapeado nesta busca</p>
            </div>
          )}
        </CardContent>
      </Card>

      <HealthScoreEditModal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        account={editingAccount ? { id: editingAccount.id, name: editingAccount.name, health_score: editingAccount.health_score } : null}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
