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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
      {/* Logger Column */}
      <div className="lg:col-span-3 space-y-8">
        <Card variant="glass" className="border-border-divider shadow-2xl relative overflow-hidden group rounded-2xl bg-surface-card/80 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-plannera-primary/[0.05] to-transparent pointer-events-none" />
          
          <CardHeader className="pb-4 pt-12 px-12">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter text-content-primary flex items-center gap-5">
              <div className="p-4 rounded-[1.25rem] bg-plannera-primary/10 border border-plannera-primary/20 group-hover:scale-105 transition-transform shadow-lg shadow-plannera-primary/10">
                <Sparkles className="w-6 h-6 text-plannera-primary" />
              </div>
              Inteligência de Esforço
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-12 px-12 pb-12 relative z-10">
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1 ml-2">
                <Target className="w-4 h-4 text-plannera-primary" />
                <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary">Contexto do Cliente</Label>
              </div>
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                className="h-14 rounded-2xl bg-surface-background/50 border-border-divider shadow-inner text-sm font-bold uppercase tracking-tight"
                options={[
                  { 
                    label: 'IDENTIFICAR POR I.A (RECOMENDADO)', 
                    value: 'all',
                    className: "bg-surface-card border-border-divider text-plannera-primary font-black"
                  },
                  ...accounts.map((a) => ({ label: a.name.toUpperCase(), value: a.id }))
                ]}
              />
            </div>

            <div className="space-y-5 relative">
              <div className="flex items-center justify-between mb-1 ml-2 group/label">
                <div className="flex items-center gap-3">
                   <Zap className="w-4 h-4 text-plannera-orange" />
                   <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary">Relato de Atividade</Label>
                </div>
                <button
                  type="button"
                  onClick={() => setText(examples[Math.floor(Math.random() * examples.length)])}
                  className="text-[9px] font-black text-plannera-primary hover:text-plannera-orange uppercase tracking-[0.2em] opacity-0 group-hover/label:opacity-100 transition-all"
                >
                  Sugestão Aleatória
                </button>
              </div>
              
              <div className="relative group/input">
                 <div className="absolute -inset-1 bg-gradient-to-r from-plannera-primary/20 to-plannera-orange/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none" />
                 <Textarea
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   placeholder="Descreva o que foi feito em liguagem natural... ex: 'Passei 45min em reunião de estratégia com a Empresa X'"
                   rows={5}
                    className="relative bg-surface-background/50 border-border-divider text-content-primary placeholder:text-content-secondary/20 font-bold tracking-tight text-lg p-8 rounded-2xl focus-visible:ring-plannera-primary/20 resize-none transition-all shadow-inner border-2"
                 />
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 ml-2">
                 <ListFilter className="w-4 h-4 text-content-secondary/30" />
                 <span className="text-[9px] font-black uppercase tracking-[0.25em] text-content-secondary opacity-50">Explorações sugeridas:</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {examples.map((ex, idx) => (
                  <motion.button
                    key={ex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    type="button"
                    onClick={() => setText(ex)}
                    className="text-[9px] font-black text-content-secondary hover:text-plannera-primary bg-surface-background/30 hover:bg-white/5 px-5 py-2.5 rounded-xl border border-border-divider/50 transition-all text-left uppercase tracking-tight shadow-sm hover:scale-105 active:scale-95"
                  >
                    {ex.split(' ').slice(0, 4).join(' ')}...
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              className="w-full h-20 bg-plannera-orange hover:bg-plannera-orange/90 text-white shadow-2xl shadow-plannera-orange/20 group active:scale-[0.98] rounded-2xl font-black transition-all"
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Processando Inteligência...</>
              ) : (
                <span className="flex items-center gap-5 text-[11px] tracking-[0.3em]">
                   REGISTRAR PRODUÇÃO DE CS
                   <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-2 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Column */}
      <div className="lg:col-span-1 h-full">
        <Card variant="glass" className="border-border-divider shadow-2xl h-full flex flex-col rounded-2xl bg-surface-card overflow-hidden">
          <CardHeader className="pb-6 pt-12 px-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-content-secondary">
                <BarChart3 className="w-5 h-5 text-plannera-primary" />
                Pareto / Eficiência
              </CardTitle>
              
              {paretoData.length > 5 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-plannera-primary/10 text-plannera-primary transition-all">
                      <Maximize2 className="w-5 h-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface-card border-border-divider max-w-2xl rounded-2xl shadow-2xl p-12">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <Building2 className="w-8 h-8 text-plannera-primary" />
                        Visão Pareto de Esforço
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-10 space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                      {paretoData.map((t, idx) => (
                        <div key={t.name} className="flex items-center gap-5 group">
                          <span className="w-8 text-[11px] font-black text-content-secondary/20 italic tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-content-primary text-xs font-black uppercase tracking-tight truncate max-w-[250px]">{t.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{t.percentage.toFixed(1)}%</span>
                                <span className="text-plannera-primary font-black text-lg tabular-nums">{t.hours.toFixed(1)}H</span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${t.percentage}%` }}
                                className="h-full bg-gradient-to-r from-plannera-primary to-plannera-orange shadow-[0_0_15px_rgba(var(--plannera-primary-rgb),0.3)]"
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
          <CardContent className="flex-1 px-8 pb-10 space-y-8 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode='popLayout'>
              {paretoData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-32">
                   <Clock className="w-16 h-16 mb-6" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sem métricas</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {paretoData.slice(0, 10).map((t, idx) => (
                    <motion.div 
                      key={t.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex flex-col space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-content-primary text-[10px] font-black uppercase tracking-tight truncate max-w-[140px] group-hover:text-plannera-primary transition-colors">{t.name}</span>
                        <span className="text-plannera-primary font-black text-sm tabular-nums">
                           {t.hours.toFixed(1)}H
                        </span>
                      </div>
                      
                      <div className="relative h-2.5 w-full bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider/50">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${t.percentage}%` }}
                           transition={{ duration: 1, delay: idx * 0.1 }}
                           className={cn(
                             "h-full rounded-full transition-all",
                             idx < 3 ? "bg-plannera-primary shadow-[0_0_12px_rgba(var(--plannera-primary-rgb),0.4)]" : "bg-plannera-primary/30"
                           )}
                         />
                      </div>
                      
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-content-secondary/30 uppercase tracking-widest">Pareto</span>
                        <span className="text-[9px] font-black text-plannera-orange/60 tabular-nums">{t.cumulativePercentage.toFixed(0)}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
          <div className="p-8 border-t border-border-divider bg-surface-background/50 text-center">
             <span className="text-[9px] font-black uppercase tracking-[0.25em] text-content-secondary/40">Análise Estratégica 80/20</span>
          </div>
        </Card>
      </div>

      {/* History Area */}
      <div className="lg:col-span-4 mt-8">
        <Card variant="glass" className="border-border-divider shadow-2xl rounded-2xl overflow-hidden bg-surface-card">
          <CardHeader className="pb-10 pt-12 px-12 border-b border-border-divider bg-surface-background/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter text-content-primary flex items-center gap-5">
                <div className="p-4 rounded-[1.25rem] bg-plannera-orange/10 border border-plannera-orange/20 shadow-lg shadow-plannera-orange/5">
                  <History className="w-7 h-7 text-plannera-orange" />
                </div>
                Journal de Atividades
              </CardTitle>
              <div className="flex items-center gap-5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary opacity-40">Produção Total Bruta:</span>
                <Badge variant="neutral" className="bg-plannera-primary/10 text-plannera-primary border-plannera-primary/20 font-black text-sm px-6 py-2 rounded-2xl shadow-lg">
                   {entries.reduce((acc, e) => acc + Number(e.parsed_hours), 0).toFixed(1)} HORAS
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="text-center py-40 opacity-10 grayscale">
                <Clock className="w-20 h-20 mx-auto mb-8" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Aguardando Registros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-surface-background/30">
                    <TableRow className="hover:bg-transparent border-b border-border-divider">
                       <TableHead className="pl-12 h-20 text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary">Logo / Conta</TableHead>
                       <TableHead className="h-20 text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary">Tipo</TableHead>
                       <TableHead className="h-20 text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary">Detalhamento Analítico</TableHead>
                       <TableHead className="h-20 text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary text-center">Horas</TableHead>
                       <TableHead className="h-20 text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary text-right pr-12">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode='popLayout'>
                      {entries.map((e, index) => (
                        <motion.tr 
                          key={e.id} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="group border-b border-border-divider hover:bg-white/5 transition-all cursor-pointer h-24"
                          onClick={() => setSelectedEntry(e)}
                        >
                           <TableCell className="pl-12">
                              <span className="text-[13px] font-black uppercase tracking-tight text-content-primary opacity-60 group-hover:opacity-100 transition-opacity">
                                 {e.accounts?.name ?? '—'}
                              </span>
                           </TableCell>
                           <TableCell>
                              <Badge className="bg-plannera-primary/5 border-plannera-primary/20 text-plannera-primary text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm group-hover:bg-plannera-primary group-hover:text-white transition-all">
                                {activityLabels[e.activity_type] || e.activity_type}
                              </Badge>
                           </TableCell>
                           <TableCell className="max-w-md">
                              <span className="text-content-primary text-sm font-medium tracking-tight line-clamp-1 group-hover:text-plannera-primary transition-colors">{e.parsed_description}</span>
                           </TableCell>
                           <TableCell className="text-center">
                              <div className="inline-flex flex-col items-center">
                                 <span className="text-plannera-orange font-black text-sm tabular-nums">{Number(e.parsed_hours).toFixed(1)}H</span>
                              </div>
                           </TableCell>
                           <TableCell className="text-right pr-12">
                              <span className="text-content-secondary font-black text-[10px] tracking-widest opacity-40">
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

      {selectedEntry && (
        <EffortEditModal
          entry={selectedEntry}
          accounts={accounts}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
