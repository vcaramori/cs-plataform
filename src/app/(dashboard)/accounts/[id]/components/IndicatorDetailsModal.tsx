'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Plus, CalendarClock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  indicator: any
  history: any[]
  accountName: string
  onAddDataPoint: () => void
  /** Chamado após salvar a data-alvo, para o pai recarregar os indicadores. */
  onUpdated?: () => void
}

export function IndicatorDetailsModal({ isOpen, onClose, indicator, history, accountName, onAddDataPoint, onUpdated }: Props) {
  const [targetDate, setTargetDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  // Sincroniza o input com a meta selecionada ao abrir/trocar
  useEffect(() => {
    setTargetDate(indicator?.target_date ?? '')
  }, [indicator?.id, indicator?.target_date, isOpen])

  if (!indicator) return null

  async function handleSaveDate() {
    setSavingDate(true)
    try {
      const res = await fetch(`/api/accounts/${indicator.account_id}/indicators/${indicator.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: targetDate || '' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar a data-alvo')
      }
      toast.success('Data-alvo atualizada!')
      onUpdated?.()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingDate(false)
    }
  }

  const dateChanged = (targetDate || '') !== (indicator.target_date ?? '')

  // Format data for chart
  const chartData = history.map(h => ({
    name: format(parseISO(h.date), 'dd/MM'),
    date: h.date,
    Value: h.value
  })).sort((a: any, b: any) => a.date.localeCompare(b.date))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white rounded-2xl shadow-2xl p-0">
        <DialogHeader className="p-8 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              Análise de {indicator.name}: <span className="text-plannera-orange">{accountName}</span>
            </div>
            <Button onClick={onAddDataPoint} className="gap-2" size="sm">
              <Plus className="w-4 h-4" /> Nova Medição
            </Button>
          </DialogTitle>

          {/* Data-alvo: define/edita o prazo da meta (preenche metas antigas sem data) */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <CalendarClock className="w-4 h-4 text-content-secondary shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Atingir até</span>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-9 w-auto rounded-lg bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white font-medium text-xs"
            />
            {dateChanged && (
              <Button onClick={handleSaveDate} disabled={savingDate} size="sm" className="h-9 gap-1.5 text-[10px] font-black uppercase tracking-widest">
                {savingDate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Salvar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4 px-6">
          {/* Chart Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary">Evolução Temporal</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight text-content-secondary dark:text-content-secondary">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator.color || '#2ba09d' }} /> Realizado
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full bg-surface-background dark:bg-slate-800/50 rounded-2xl p-6 border border-border-divider dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="currentColor"
                    className="text-content-secondary dark:text-content-secondary"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-content-secondary dark:text-content-secondary"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-divider)', borderRadius: '12px' }}
                    labelStyle={{ color: 'var(--content-primary)', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Value"
                    stroke={indicator.color || '#2ba09d'}
                    strokeWidth={3}
                    dot={{ r: 4, fill: indicator.color || '#2ba09d' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History Table */}
          <div className="space-y-4 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary px-2">Histórico Completo de Eventos</h3>
            <div className="rounded-2xl border border-border-divider dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-background dark:bg-slate-800/50 border-b border-border-divider dark:border-slate-800">
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary text-[9px]">Referência</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary text-[9px]">Origem</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary text-[9px] text-center">Valor</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary text-[9px]">Anotação</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h: any) => (
                    <tr key={h.id} className="border-b border-border-divider dark:border-slate-800 hover:bg-surface-background dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#2d3558] dark:text-white">{format(parseISO(h.date), 'dd/MM/yyyy')}</span>
                          <span className="text-[9px] text-content-secondary dark:text-content-secondary uppercase font-medium">Lançado: {format(parseISO(h.created_at), 'dd/MM')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-plannera-orange font-bold uppercase text-[9px]">
                          {h.source_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-surface-card text-content-primary">
                          {h.value} {indicator.unit}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-content-secondary dark:text-content-secondary italic text-[11px] leading-relaxed">
                           {h.notes || '—'}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-content-secondary">
                        Nenhuma medição registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
