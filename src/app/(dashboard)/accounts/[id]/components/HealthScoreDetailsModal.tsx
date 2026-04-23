'use client'

import { useState, useEffect } from 'react'
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
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
  User,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Props {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
}

export function HealthScoreDetailsModal({ isOpen, onClose, accountId, accountName }: Props) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, accountId])

  async function fetchHistory() {
    setLoading(true)
    try {
      const res = await fetch(`/api/health-scores/${accountId}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar por data para alinhar Manual e Shadow no mesmo eixo vertical
  const groupedData = (data?.history || []).reduce((acc: any, h: any) => {
    const dateKey = h.date
    if (!acc[dateKey]) {
      acc[dateKey] = {
        name: format(parseISO(h.date), 'dd/MM'),
        date: h.date,
        Manual: null,
        IA: null,
      }
    }
    if (h.manual_score !== null) acc[dateKey].Manual = h.manual_score
    if (h.shadow_score !== null) acc[dateKey].IA = h.shadow_score
    return acc
  }, {})

  const chartData = Object.values(groupedData)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-surface-card border-border-divider text-content-primary">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              Análise de Saúde: <span className="text-plannera-orange">{accountName}</span>
            </div>
            {data?.discrepancy_alert && (
              <Badge className="bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20 animate-pulse">
                <AlertTriangle className="w-3 h-3 mr-1.5" /> Alerta de Discrepância
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-content-secondary">Evolução Temporal: Manual vs Shadow</h3>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tight">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f7941e]" /> Manual</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#6366f1]" /> Shadow IA</div>
                </div>
              </div>
              <div className="h-[300px] w-full bg-surface-background rounded-2xl p-6 border border-border-divider">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Manual"
                      stroke="#f7941e"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f7941e' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="IA"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#6366f1' }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* History Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-content-secondary px-2">Histórico Completo de Eventos</h3>
              <div className="rounded-2xl border border-border-divider overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-background border-b border-border-divider">
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary text-[9px]">Referência</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary text-[9px]">Tipo / Origem</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary text-[9px] text-center">Score</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary text-[9px]">Classificação</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-content-secondary text-[9px]">Nota / Raciocínio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.history?.map((h: any) => (
                      <tr key={h.id} className="border-b border-border-divider hover:bg-surface-background transition-colors group">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-content-primary">{format(parseISO(h.date), 'dd/MM/yyyy')}</span>
                            <span className="text-[9px] text-content-secondary uppercase font-medium">Criado: {format(parseISO(h.created_at), 'dd/MM HH:mm')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {h.manual_score !== null ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-plannera-orange font-bold uppercase text-[9px]">
                                {h.source_type === 'manual_update' ? 'Atualização Manual' : 'Lançamento Manual'}
                              </span>
                              <span className="text-content-secondary text-[9px] italic opacity-50">#manual</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase text-[9px]">
                              <Sparkles className="w-3 h-3" /> Análise de IA
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "text-sm font-black px-2 py-0.5 rounded-lg",
                            h.manual_score !== null ? "bg-plannera-orange/10 text-plannera-orange" : "bg-indigo-400/10 text-indigo-400"
                          )}>
                            {h.manual_score ?? h.shadow_score}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-content-primary font-medium">
                          {h.classification}
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <p className="text-content-secondary italic text-[11px] leading-relaxed">
                             {h.notes && h.notes.trim() !== "" ? h.notes : (h.shadow_reasoning && h.shadow_reasoning.trim() !== "" ? h.shadow_reasoning : '—')}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
