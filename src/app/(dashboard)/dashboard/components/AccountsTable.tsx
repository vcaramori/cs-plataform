'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronRight } from 'lucide-react'
import type { Account, Contract } from '@/lib/supabase/types'

type AccountWithContracts = Account & { contracts: Contract[] }

function HealthBadge({ score }: { score: number }) {
  if (score >= 70) return <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-sm">{score}</span>
  if (score >= 40) return <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold text-sm">{score}</span>
  return <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-sm">{score}</span>
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />
  if (trend === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-slate-500" />
}

function SegmentBadge({ segment }: { segment: string }) {
  const colors: Record<string, string> = {
    Enterprise: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Mid-Market': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    SMB: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }
  return <Badge className={`text-xs font-medium border ${colors[segment] ?? ''}`}>{segment}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'at-risk': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    churned: 'bg-red-500/20 text-red-300 border-red-500/30',
    'in-negotiation': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }
  const labels: Record<string, string> = {
    active: 'Ativo', 'at-risk': 'Em Risco', churned: 'Churn', 'in-negotiation': 'Em Negociação',
  }
  return <Badge className={`text-xs font-medium border ${colors[status] ?? ''}`}>{labels[status] ?? status}</Badge>
}

export function AccountsTable({ accounts }: { accounts: AccountWithContracts[] }) {
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')

  const filtered = accounts.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
    const matchSegment = segmentFilter === 'all' || a.segment === segmentFilter
    return matchSearch && matchSegment
  })

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white text-lg">Contas</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar conta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-56 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9"
              />
            </div>
            <div className="flex gap-1">
              {['all', 'SMB', 'Mid-Market', 'Enterprise'].map(s => (
                <button
                  key={s}
                  onClick={() => setSegmentFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${segmentFilter === s ? 'bg-plannera-orange text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {s === 'all' ? 'Todos' : s}
                </button>
              ))}
            </div>
            <Link href="/accounts/new">
              <Button size="sm" className="bg-plannera-orange hover:bg-plannera-orange/80 text-white h-9 gap-1.5">
                <Plus className="w-4 h-4" />
                Nova Conta
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-medium">Conta</TableHead>
              <TableHead className="text-slate-400 font-medium">Segmento</TableHead>
              <TableHead className="text-slate-400 font-medium">MRR</TableHead>
              <TableHead className="text-slate-400 font-medium">Renovação</TableHead>
              <TableHead className="text-slate-400 font-medium">Status</TableHead>
              <TableHead className="text-slate-400 font-medium text-center">Health</TableHead>
              <TableHead className="text-slate-400 font-medium text-center">Trend</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  {accounts.length === 0 ? 'Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.' : 'Nenhuma conta encontrada.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(account => {
                const contracts = Array.isArray(account.contracts) ? account.contracts : (account.contracts ? [account.contracts] : [])
                const activeContracts = contracts.filter(c => c.status === 'active')
                
                const totalMRR = activeContracts.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)
                
                // Get nearest renewal date from active contracts
                const nearestRenewal = activeContracts
                  .filter(c => c.renewal_date)
                  .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())[0]

                return (
                  <TableRow key={account.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium text-sm">{account.name}</p>
                        {account.industry && <p className="text-slate-500 text-xs">{account.industry}</p>}
                      </div>
                    </TableCell>
                    <TableCell><SegmentBadge segment={account.segment} /></TableCell>
                    <TableCell>
                      <span className="text-slate-200 text-sm font-medium">
                        {totalMRR > 0 ? `R$ ${totalMRR.toLocaleString('pt-BR')}` : '—'}
                      </span>
                      {activeContracts.length > 1 && (
                        <p className="text-[10px] text-slate-500">{activeContracts.length} produtos</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300 text-sm">
                        {nearestRenewal?.renewal_date
                          ? new Date(nearestRenewal.renewal_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {activeContracts.length > 0 ? (
                        <StatusBadge status="active" />
                      ) : (
                        <span className="text-slate-600 text-xs">Sem contrato</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center"><HealthBadge score={account.health_score} /></TableCell>
                    <TableCell className="text-center"><TrendIcon trend={account.health_trend} /></TableCell>
                    <TableCell>
                      <Link href={`/accounts/${account.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
