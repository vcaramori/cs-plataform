'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

interface Entry {
  id: string
  account_id: string
  accounts: { name: string } | null
  activity_type: string
  parsed_hours: number
  parsed_description: string
  date: string
}

interface EsforcoTableProps {
  entries: Entry[]
  totalHours: number
  onSelectEntry: (entry: Entry) => void
  activityLabels: Record<string, string>
}

export function EsforcoTable({
  entries,
  totalHours,
  onSelectEntry,
  activityLabels
}: EsforcoTableProps) {
  return (
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
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary opacity-60">Produção Total Bruta:</span>
            <Badge variant="neutral" className="bg-plannera-primary/10 text-plannera-primary border-plannera-primary/20 font-black text-sm px-6 py-2 rounded-2xl shadow-lg">
              {totalHours.toFixed(1)} HORAS
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
                      onClick={() => onSelectEntry(e)}
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
                        <span className="text-content-secondary font-black text-[10px] tracking-widest opacity-60">
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
  )
}
