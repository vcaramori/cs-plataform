'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  title: string
  status: 'pending' | 'ongoing' | 'delayed' | 'completed'
  target_date: string | null
}

const statusConfig = {
  completed: { label: 'Sucesso', color: 'text-plannera-ds', bg: 'bg-plannera-ds/10', icon: CheckCircle2, border: 'border-plannera-ds/20' },
  ongoing: { label: 'Foco', color: 'text-plannera-sop', bg: 'bg-plannera-sop/10', icon: Clock, border: 'border-plannera-sop/20' },
  delayed: { label: 'Atraso', color: 'text-plannera-demand', bg: 'bg-plannera-demand/10', icon: AlertCircle, border: 'border-plannera-demand/20' },
  pending: { label: 'Pendente', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Target, border: 'border-slate-500/20' },
}

export function SuccessPlan({ goals }: { goals: Goal[] }) {
  return (
    <div className="space-y-4">
      {goals.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 border-dashed p-10 text-center">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Nenhuma meta estratégica definida</p>
        </Card>
      ) : (
        goals.map((goal, idx) => {
          const config = statusConfig[goal.status] || statusConfig.pending
          const Icon = config.icon
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={cn(
                "glass-card group hover:bg-white/5 transition-all duration-300 border-none relative overflow-hidden",
                goal.status === 'completed' && "opacity-60 grayscale-[0.5]"
              )}>
                {goal.status === 'completed' && (
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                )}
                
                <CardContent className="p-4 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                      config.bg, config.color
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-white text-sm font-black uppercase tracking-tight truncate",
                        goal.status === 'completed' && "line-through text-slate-500"
                      )}>{goal.title}</span>
                      {goal.target_date && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <Clock className="w-3 h-3 text-slate-600" />
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            Meta: {new Date(goal.target_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none h-5",
                      config.bg, config.color
                    )}>
                      {config.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })
      )}
      
      {goals.length > 0 && (
         <button className="w-full py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group">
            Abrir Plano Completo
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
         </button>
      )}
    </div>
  )
}
