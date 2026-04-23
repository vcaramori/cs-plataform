'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ticket, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TicketProps {
  id: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'critical' | string
  opened_at: string
}

const priorityConfig: Record<string, { color: string, bg: string, ring: string }> = {
  critical: { color: 'text-plannera-demand', bg: 'bg-plannera-demand/10', ring: 'ring-plannera-demand/20' },
  high: { color: 'text-plannera-orange', bg: 'bg-plannera-orange/10', ring: 'ring-plannera-orange/20' },
  medium: { color: 'text-plannera-operations', bg: 'bg-plannera-operations/10', ring: 'ring-plannera-operations/20' },
  low: { color: 'text-content-secondary', bg: 'bg-surface-background', ring: 'ring-border-divider' },
}

export function RecentTicketsWidget({ tickets }: { tickets: TicketProps[] }) {
  const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed')

  return (
    <div className="space-y-4">
      {openTickets.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest leading-none">Sem tickets críticos no radar</p>
        </Card>
      ) : (
        openTickets.slice(0, 3).map((t, idx) => {
          const config = priorityConfig[t.priority] || priorityConfig.low
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="group transition-all duration-300 relative overflow-hidden">
                {t.priority === 'critical' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-plannera-demand/5 blur-2xl pointer-events-none" />
                )}

                <CardContent className="p-4 flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                    config.bg, config.color
                  )}>
                    <AlertTriangle className={cn("w-5 h-5", t.priority === 'critical' && "animate-pulse")} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                       <span className="text-content-primary text-sm font-bold uppercase tracking-tight truncate pr-4">{t.title}</span>
                       <Badge variant="outline" className={cn(
                         "text-[8px] font-bold uppercase tracking-[0.1em] px-2 py-0 border-none h-4 shrink-0",
                         config.bg, config.color, config.ring
                       )}>
                         {t.priority}
                       </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-background border border-border-divider">
                          <Clock className="w-3 h-3 text-content-secondary" />
                          <span className="text-[9px] text-content-secondary font-black uppercase tracking-tighter">
                            {new Date(t.opened_at).toLocaleDateString('pt-BR')}
                          </span>
                       </div>
                       <div className="text-[10px] text-content-secondary font-bold uppercase tracking-widest italic opacity-50">{t.status}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })
      )}

      {openTickets.length > 0 && (
         <button className="w-full py-3 rounded-xl border border-border-divider bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group mt-2">
            Ver Todos os Tickets
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
         </button>
      )}
    </div>
  )
}
