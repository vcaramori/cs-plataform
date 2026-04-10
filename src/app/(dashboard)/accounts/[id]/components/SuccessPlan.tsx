'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface Goal {
  id: string
  title: string
  status: 'pending' | 'ongoing' | 'delayed' | 'completed'
  target_date: string | null
}

const statusConfig = {
  completed: { label: 'Concluído', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  ongoing: { label: 'Em andamento', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  delayed: { label: 'Atrasado', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  pending: { label: 'Pendente', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Target },
}

export function SuccessPlan({ goals }: { goals: Goal[] }) {
  return (
    <div className="space-y-3">
      {goals.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 border-dashed p-6 text-center">
          <p className="text-slate-600 text-xs">Nenhum objetivo definido no Plano de Sucesso.</p>
        </Card>
      ) : (
        goals.map(goal => {
          const config = statusConfig[goal.status] || statusConfig.pending
          const Icon = config.icon
          return (
            <Card key={goal.id} className="bg-slate-950 border-slate-800/50 hover:bg-slate-900 transition-colors">
              <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-white text-sm font-bold truncate">{goal.title}</span>
                    {goal.target_date && (
                      <span className="text-[10px] text-slate-500">
                        Meta: {new Date(goal.target_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`uppercase tracking-tighter text-[9px] font-black ${config.color} border-none`}>
                  {config.label}
                </Badge>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
