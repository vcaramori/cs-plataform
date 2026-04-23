'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Label } from '@/components/ui/label'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { Clock, Loader2, Sparkles, ChevronDown, Eye, Target, Zap, TrendingUp, History, ListFilter, ChevronRight, Building2, Maximize2, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const activityLabels: Record<string, string> = {
  preparation: 'Preparação de material',
  'environment-analysis': 'Análise de ambiente',
  strategy: 'Estratégia',
  reporting: 'Relatório',
  'internal-meeting': 'Reunião interna',
  meeting: 'Reunião com cliente',
  onboarding: 'Implantação / Onboarding',
  qbr: 'QBR / Sucesso',
  other: 'Outro',
}

type Account = { id: string; name: string }
type Entry = {
  id: string
  account_id: string
  csm_id: string
  activity_type: string
  natural_language_input: string
  parsed_hours: number
  parsed_description: string
  date: string
  logged_at: string
  accounts: { name: string } | null
}

const examples = [
  'Passei 2h preparando o deck de QBR para a Empresa X',
  'Analisei os logs de erro por 45min para entender o problema da Empresa Y',
  'Reunião interna de 30min para alinhar estratégia de renovação',
  '1h30 gerando relatório de esforço mensal',
]

export function EsforcoClient({
  accounts,
  initialEntries,
}: {
  accounts: Account[]
  initialEntries: Entry[]
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<Entry[]>(initialEntries)

  async function handleSubmit() {
    if (!text.trim()) {
      toast.error('Digite o que você fez')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: text,
          account_id: selectedAccountId !== 'all' ? selectedAccountId : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 422 && data.parsed) {
          toast.error(`LOGO não identificado. Selecione o LOGO manualmente.`)
        } else {
          toast.error(data.error ?? 'Erro ao registrar')
        }
        return
      }

      toast.success(
        `${data.parsed_hours}h registrada — ${activityLabels[data.activity_type] ?? data.activity_type}`
      )
      setText('')
      setSelectedAccountId('all')
      router.refresh()

      // Adiciona ao topo da lista local para feedback imediato
      setEntries((prev) => [data, ...prev].slice(0, 50))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = (updated: Entry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelectedEntry(updated)
  }

  // Agrupa horas por conta para o totalizador
  const totalsByAccount = entries.reduce<Record<string, { name: string; hours: number }>>(
    (acc, e) => {
      const name = e.accounts?.name ?? 'LOGO removido'
      if (!acc[e.account_id]) acc[e.account_id] = { name, hours: 0 }
      acc[e.account_id].hours += Number(e.parsed_hours)
      return acc
    },
    {}
  )

  const sortedAccounts = Object.values(totalsByAccount).sort((a, b) => b.hours - a.hours)
  const totalHours = sortedAccounts.reduce((acc, curr) => acc + curr.hours, 0)
  
  // Pareto Data
  let cumulativeHours = 0
  const paretoData = sortedAccounts.map(acc => {
    cumulativeHours += acc.hours
    return {
      ...acc,
      percentage: (acc.hours / totalHours) * 100,
      cumulativePercentage: (cumulativeHours / totalHours) * 100
    }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Logger Column */}
      <div className="lg:col-span-3 space-y-8">
        <Card variant="glass" className="border-border shadow-2xl relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
          
          <CardHeader className="pb-4 pt-10 px-10">
            <CardTitle className="h2-section !text-xl !text-foreground flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              Inteligência de Esforço
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-10 px-10 pb-10 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 ml-1">
                <Target className="w-4 h-4 text-primary" />
                <Label className="label-premium">Contexto do Cliente</Label>
              </div>
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                options={[
                  { 
                    label: 'IDENTIFICAR POR I.A (RECOMENDADO)', 
                    value: 'all',
                    className: "bg-white border border-slate-300 text-[#2d3558] dark:bg-slate-800 dark:text-white font-extrabold"
                  },
                  ...accounts.map((a) => ({ label: a.name.toUpperCase(), value: a.id }))
                ]}
              />
            </div>

            <div className="space-y-4 relative">
              <div className="flex items-center justify-between mb-1 ml-1 group/label">
                <div className="flex items-center gap-2">
                   <Zap className="w-4 h-4 text-primary" />
                   <Label className="label-premium">Relato de Atividade</Label>
                </div>
                <button
                  type="button"
                  onClick={() => setText(examples[Math.floor(Math.random() * examples.length)])}
                  className="text-[10px] font-extrabold text-primary hover:text-foreground uppercase tracking-widest opacity-0 group-hover/label:opacity-100 transition-opacity"
                >
                  Sugestão Aleatória
                </button>
              </div>
              
              <div className="relative group/input">
                 <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none animate-pulse" />
                 <Textarea
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   placeholder="Descreva o que foi feito em liguagem natural... ex: 'Passei 45min em reunião de estratégia com a Empresa X'"
                   rows={4}
                    className="relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-foreground placeholder:text-muted-foreground/30 font-bold tracking-tight text-base p-6 rounded-2xl focus-visible:ring-primary/30 resize-none transition-all shadow-sm"
                 />
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                 <ListFilter className="w-4 h-4 text-muted-foreground/50" />
                 <span className="label-premium opacity-50">Explorações sugeridas:</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {examples.map((ex, idx) => (
                  <motion.button
                    key={ex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    type="button"
                    onClick={() => setText(ex)}
                    className="text-[10px] font-extrabold text-[#5c5b5b] dark:text-slate-400 hover:text-primary bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-left uppercase tracking-tight shadow-sm"
                  >
                    {ex.split(' ').slice(0, 4).join(' ')}...
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              className="w-full h-16 bg-[#f7941e] text-white hover:bg-[#e0861b] shadow-xl shadow-[#f7941e]/20 group active:scale-[0.98] rounded-2xl font-extrabold"
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Processando Inteligência...</>
              ) : (
                <span className="flex items-center gap-4 text-xs tracking-[0.2em]">
                   REGISTRAR PRODUÇÃO
                   <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Column */}
      <div className="lg:col-span-1 h-full">
        <Card variant="glass" className="border-border shadow-2xl h-full flex flex-col rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 pt-10 px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="h2-section !text-[11px] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Curva de Esforço
              </CardTitle>
              
              {paretoData.length > 5 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary transition-all">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface-card border-border-divider max-w-2xl rounded-2xl shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="h2-section flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-primary" />
                        Visão Pareto de Esforço (Todos os Clientes)
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {paretoData.map((t, idx) => (
                        <div key={t.name} className="flex items-center gap-4 group">
                          <span className="w-6 text-[10px] font-extrabold text-content-secondary/30 italic tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-foreground text-xs font-extrabold uppercase tracking-tight truncate max-w-[200px]">{t.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="label-premium opacity-40 !text-[9px]">{t.percentage.toFixed(1)}%</span>
                                <span className="text-primary font-extrabold text-sm">{t.hours.toFixed(1)}H</span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-border-divider">
                              <div 
                                className="h-full bg-primary shadow-[0_0_8px_var(--primary)]"
                                style={{ width: `${t.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-5 pb-8 space-y-6 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode='popLayout'>
              {paretoData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                   <Clock className="w-12 h-12 mb-4" />
                   <p className="label-premium">Sem métricas hoje</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {paretoData.slice(0, 8).map((t, idx) => (
                    <motion.div 
                      key={t.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex flex-col space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground text-[10px] font-extrabold uppercase tracking-tight truncate max-w-[120px] group-hover:text-primary transition-colors">{t.name}</span>
                        <span className="text-primary font-extrabold text-xs tabular-nums">
                           {t.hours.toFixed(1)}H
                        </span>
                      </div>
                      
                      <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-border-divider/50">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${t.percentage}%` }}
                           transition={{ duration: 1, delay: idx * 0.1 }}
                           className={cn(
                             "h-full rounded-full transition-all",
                             idx < 3 ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-primary/40"
                           )}
                         />
                      </div>
                      
                      {idx < 8 && (
                         <div className="flex justify-between items-center px-0.5">
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Pareto Acumulado</span>
                            <span className="text-[8px] font-bold text-muted-foreground/60">{t.cumulativePercentage.toFixed(0)}%</span>
                         </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-center">
             <span className="label-premium !text-[8px] opacity-40 uppercase tracking-widest">Distribuição por Pareto (Volume 80/20)</span>
          </div>
        </Card>
      </div>

      {/* History Area */}
      <div className="lg:col-span-4 mt-8">
        <Card variant="glass" className="border-border shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-8 pt-8 px-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <CardTitle className="h2-section !text-xl !text-foreground flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <History className="w-6 h-6 text-primary" />
                </div>
                Journal de Atividades Recentes
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="label-premium opacity-50">Produção Total Bruta:</span>
                <Badge variant="neutral" className="text-primary border-primary/20 font-extrabold text-xs px-4 py-1.5 rounded-xl">
                   {entries.reduce((acc, e) => acc + Number(e.parsed_hours), 0).toFixed(1)} HORAS
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="text-center py-32 opacity-20 bg-slate-50/50 dark:bg-slate-900/50">
                <Clock className="w-16 h-16 mx-auto mb-6" />
                <p className="label-premium !text-sm">Histórico aguardando novos registros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                       <TableHead className="pl-8 text-[11px]">Logo / Conta</TableHead>
                       <TableHead className="text-[11px]">Tipo de Atividade</TableHead>
                       <TableHead className="text-[11px]">Detalhamento Analítico</TableHead>
                       <TableHead className="text-center text-[11px]">Horas</TableHead>
                       <TableHead className="text-right pr-8 text-[11px]">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode='popLayout'>
                      {entries.map((e, index) => (
                        <motion.tr 
                          key={e.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="group border-b border-border-divider hover:bg-muted/40 transition-all cursor-pointer h-16"
                          onClick={() => setSelectedEntry(e)}
                        >
                           <TableCell className="p-4 pl-8">
                              <span className="text-[13px] font-extrabold uppercase tracking-tight text-content-primary">
                                 {e.accounts?.name ?? '—'}
                              </span>
                           </TableCell>
                           <TableCell>
                              <Badge variant="outline" className="bg-surface-background border-border-divider text-content-secondary text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-2xl">
                                {activityLabels[e.activity_type] || e.activity_type}
                              </Badge>
                           </TableCell>
                           <TableCell>
                              <span className="text-content-secondary text-sm font-medium tracking-tight line-clamp-1 group-hover:text-foreground transition-colors">{e.parsed_description}</span>
                           </TableCell>
                           <TableCell className="text-center">
                              <div className="inline-flex flex-col items-center">
                                 <span className="text-content-primary font-extrabold text-[11px] tracking-widest">{Number(e.parsed_hours).toFixed(1)}H</span>
                              </div>
                           </TableCell>
                           <TableCell className="text-right pr-8">
                              <span className="text-content-secondary font-extrabold text-[11px] tracking-widest">
                                 {format(new Date(e.date + 'T12:00:00'), 'dd/MM/yyyy')}
                              </span>
                           </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
