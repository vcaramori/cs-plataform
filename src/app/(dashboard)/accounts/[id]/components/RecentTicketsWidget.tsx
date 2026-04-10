'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ticket, AlertTriangle, Clock } from 'lucide-react'

interface TicketProps {
  id: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'critical' | string
  opened_at: string
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300',
  high: 'bg-orange-500/20 text-orange-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-slate-500/20 text-slate-300',
}

export function RecentTicketsWidget({ tickets }: { tickets: TicketProps[] }) {
  const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed')

  return (
    <div className="space-y-2">
      {openTickets.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 border-dashed p-6 text-center">
          <p className="text-slate-600 text-xs">Sem tickets críticos no momento.</p>
        </Card>
      ) : (
        openTickets.slice(0, 3).map(t => (
          <div 
            key={t.id} 
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/50 hover:bg-slate-900 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${t.priority === 'critical' ? 'bg-red-500/10' : 'bg-slate-900'}`}>
              <AlertTriangle className={`w-4 h-4 ${t.priority === 'critical' ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-bold truncate pr-2">{t.title}</span>
                <Badge className={`text-[8px] font-black uppercase px-1.5 py-0 border-none ${priorityColors[t.priority] || ''}`}>
                  {t.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-slate-500 text-[9px] flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {new Date(t.opened_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-slate-700 text-[9px]">•</span>
                <span className="text-slate-500 text-[9px] uppercase font-black tracking-tighter">{t.status}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
