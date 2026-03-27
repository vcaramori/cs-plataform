import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, CalendarDays, Clock, DollarSign } from 'lucide-react'
import type { Contract } from '@/lib/supabase/types'

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ContractCard({ contract }: { contract: Contract }) {
  const days = daysUntil(contract.renewal_date)
  const renewalColor = days < 30 ? 'text-red-400' : days < 90 ? 'text-yellow-400' : 'text-emerald-400'

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'at-risk': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    churned: 'bg-red-500/20 text-red-300 border-red-500/30',
    'in-negotiation': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Contrato Ativo
          </CardTitle>
          <Badge className={`text-xs border ${statusColors[contract.status] ?? ''}`}>
            {contract.service_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 text-xs">MRR</span>
            </div>
            <p className="text-white font-bold text-lg">R$ {Number(contract.mrr).toLocaleString('pt-BR')}</p>
            <p className="text-slate-500 text-xs">ARR: R$ {Number(contract.arr).toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-xs">Renovação</span>
            </div>
            <p className={`font-bold text-lg ${renewalColor}`}>
              {new Date(contract.renewal_date).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-slate-500 text-xs">{days > 0 ? `em ${days} dias` : `${Math.abs(days)} dias atrás`}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 text-xs">Horas Contratadas</span>
            </div>
            <p className="text-white font-bold text-lg">{contract.contracted_hours_monthly}h</p>
            <p className="text-slate-500 text-xs">por mês</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400 text-xs">Custo/Hora CSM</span>
            </div>
            <p className="text-white font-bold text-lg">R$ {Number(contract.csm_hour_cost).toLocaleString('pt-BR')}</p>
            <p className="text-slate-500 text-xs">por hora</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
