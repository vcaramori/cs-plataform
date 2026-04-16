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
import { Clock, Loader2, Sparkles, ChevronDown, Eye, Target, Zap, TrendingUp, History, ListFilter, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Logger Column */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="glass-card border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent pointer-events-none" />
          
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-white text-lg font-black uppercase tracking-tighter flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              Inteligência de Esforço
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-8 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1 ml-1">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Contexto de LOGO</Label>
              </div>
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                options={[
                  { label: 'IDENTIFICAR POR I.A (RECOMENDADO)', value: 'all' },
                  ...accounts.map((a) => ({ label: a.name.toUpperCase(), value: a.id }))
                ]}
              />
            </div>

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between mb-1 ml-1 group/label">
                <div className="flex items-center gap-2">
                   <Zap className="w-3.5 h-3.5 text-indigo-400" />
                   <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Relato de Atividade</Label>
                </div>
                <button
                  type="button"
                  onClick={() => setText(examples[Math.floor(Math.random() * examples.length)])}
                  className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest opacity-0 group-hover/label:opacity-100 transition-opacity"
                >
                  Sugestão Aleatória
                </button>
              </div>
              
              <div className="relative group/input">
                 <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none animate-pulse" />
                 <Textarea
                   value={text}
                   onChange={(e) => setText(e.target.value)}
                   placeholder="Descreva o que foi feito... ex: 'Passei 45min em reunião de estratégia com a Empresa X'"
                   rows={4}
                   className="relative bg-black/40 border-white/5 text-slate-100 placeholder:text-slate-700 font-bold tracking-tight text-base p-6 rounded-2xl focus-visible:ring-indigo-500/50 resize-none transition-all shadow-inner"
                 />
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                 <ListFilter className="w-3 h-3 text-slate-600" />
                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Atividades Frequentes:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, idx) => (
                  <motion.button
                    key={ex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    type="button"
                    onClick={() => setText(ex)}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-all text-left uppercase tracking-tight"
                  >
                    {ex.split(' ').slice(0, 4).join(' ')}...
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] h-14 shadow-[0_0_30px_rgba(99,102,241,0.3)] group transition-all active:scale-95"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-3" /> Processando Inteligência...</>
              ) : (
                <span className="flex items-center gap-3">
                   Publicar Registro
                   <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Column */}
      <div className="lg:col-span-1">
        <Card className="glass-card border-none shadow-2xl h-full flex flex-col">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Telemetry Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-4 pb-8 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
            <AnimatePresence mode='popLayout'>
              {Object.values(totalsByAccount).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                   <Clock className="w-10 h-10 mb-2" />
                   <p className="text-[9px] font-black uppercase tracking-widest">Sem Métricas</p>
                </div>
              ) : (
                Object.values(totalsByAccount)
                  .sort((a, b) => b.hours - a.hours)
                  .map((t, idx) => (
                    <motion.div 
                      key={t.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group flex flex-col p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all relative overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate max-w-[120px]">{t.name}</span>
                        <Badge className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-black text-[10px]">
                           {t.hours.toFixed(1)}H
                        </Badge>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min(100, (t.hours / 10) * 100)}%` }}
                           transition={{ duration: 1, delay: idx * 0.1 }}
                           className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                         />
                      </div>
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </CardContent>
          <div className="p-4 border-t border-white/5 text-center">
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Baseado em Entradas Indiretas</span>
          </div>
        </Card>
      </div>

      {/* History Area */}
      <div className="lg:col-span-4 mt-4">
        <Card className="glass-card border-none shadow-2xl overflow-hidden">
          <CardHeader className="pb-8 pt-8 px-10 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <History className="w-5 h-5 text-slate-400" />
                </div>
                Journal de Recentes
              </CardTitle>
              <div className="flex items-center gap-2 opacity-40">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo Total Logs:</span>
                <Badge variant="outline" className="text-white border-white/10 font-bold">
                   {entries.reduce((acc, e) => acc + Number(e.parsed_hours), 0).toFixed(1)} Horas
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="text-center py-24 opacity-20">
                <Clock className="w-12 h-12 mx-auto mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Histórico Vazio</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                       <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-slate-500 font-black uppercase tracking-widest text-[10px] pl-10">Contexto / LOGO</TableHead>
                          <TableHead className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Atividade Linkada</TableHead>
                          <TableHead className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Detalhamento Analítico</TableHead>
                          <TableHead className="text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">Esforço (H)</TableHead>
                          <TableHead className="text-right text-slate-500 font-black uppercase tracking-widest text-[10px] pr-10">Data Registro</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode='popLayout'>
                        {entries.map((e, index) => (
                          <motion.tr 
                            key={e.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                            onClick={() => setSelectedEntry(e)}
                          >
                            <TableCell className="py-5 pl-10">
                               <span className="text-white font-black text-sm tracking-tight group-hover:text-indigo-400 transition-colors uppercase">
                                 {e.accounts?.name ?? '—'}
                               </span>
                            </TableCell>
                            <TableCell>
                               <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                 {activityLabels[e.activity_type] || e.activity_type}
                               </Badge>
                            </TableCell>
                            <TableCell>
                               <span className="text-slate-400 text-sm font-bold tracking-tight line-clamp-1">{e.parsed_description}</span>
                            </TableCell>
                            <TableCell className="text-center">
                               <div className="inline-flex flex-col items-center">
                                  <span className="text-indigo-400 font-black text-base tracking-tighter">{Number(e.parsed_hours).toFixed(1)}</span>
                                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Hrs</span>
                               </div>
                            </TableCell>
                            <TableCell className="text-right pr-10">
                               <span className="text-slate-500 text-[10px] font-black font-mono">
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

      <EffortEditModal 
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdate={handleUpdate}
        accounts={accounts}
      />
    </div>
  )
}
