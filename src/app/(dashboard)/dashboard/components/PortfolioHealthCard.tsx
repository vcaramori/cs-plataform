import { Card, CardContent } from '@/components/ui/card'
import { Building2, DollarSign, Heart, AlertTriangle, CalendarClock } from 'lucide-react'

interface Props {
  totalAccounts: number
  totalMRR: number
  avgHealthScore: number
  atRisk: number
  renewalsSoon: number
}

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioHealthCard({ totalAccounts, totalMRR, avgHealthScore, atRisk, renewalsSoon }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        icon={Building2}
        label="Total de Contas"
        value={totalAccounts}
        color="bg-indigo-600/20 text-indigo-400"
      />
      <KPICard
        icon={DollarSign}
        label="MRR Total"
        value={`R$ ${totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
        sub={`ARR: R$ ${(totalMRR * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
        color="bg-emerald-600/20 text-emerald-400"
      />
      <KPICard
        icon={Heart}
        label="Health Médio"
        value={`${avgHealthScore}`}
        sub="Portfólio geral"
        color={`${avgHealthScore >= 70 ? 'bg-emerald-600/20 text-emerald-400' : avgHealthScore >= 40 ? 'bg-yellow-600/20 text-yellow-400' : 'bg-red-600/20 text-red-400'}`}
      />
      <KPICard
        icon={AlertTriangle}
        label="Em Risco"
        value={atRisk}
        sub="Health score < 40"
        color={atRisk > 0 ? 'bg-red-600/20 text-red-400' : 'bg-slate-700 text-slate-400'}
      />
      <KPICard
        icon={CalendarClock}
        label="Renovações (30d)"
        value={renewalsSoon}
        sub="Próximos 30 dias"
        color={renewalsSoon > 0 ? 'bg-orange-600/20 text-orange-400' : 'bg-slate-700 text-slate-400'}
      />
    </div>
  )
}
