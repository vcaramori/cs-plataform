import { Building2, DollarSign, Heart, AlertTriangle, CalendarClock, Star } from 'lucide-react'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'

interface Props {
  totalAccounts: number
  totalActiveContracts: number
  totalMRR: number
  avgHealthScore: number
  atRisk: number
  renewalsSoon: number
  npsScore: number | null
}

export function PortfolioHealthCard({
  totalAccounts,
  totalActiveContracts,
  totalMRR,
  avgHealthScore,
  atRisk,
  renewalsSoon,
  npsScore,
}: Props) {
  const isMrrMillion = totalMRR >= 1000000
  const isArrMillion = (totalMRR * 12) >= 1000000

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCardPremium
        title={"TOTAL DE LOGOS"}
        value={totalAccounts}
        status={`${totalActiveContracts === 1 ? 'Conta' : 'Contas'}: ${totalActiveContracts}`}
        iconName="Building2"
        colorVariant="default"
      />
      <StatCardPremium
        title={"MRR TOTAL (R$)"}
        value={isMrrMillion ? totalMRR / 1000000 : totalMRR}
        decimal={isMrrMillion ? 3 : 0}
        suffix={isMrrMillion ? ' Mi' : ''}
        prefix=""
        status={
          isArrMillion
            ? `ARR: R$ ${((totalMRR * 12) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Mi`
            : `ARR: R$ ${(totalMRR * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        }
        iconName="DollarSign"
        colorVariant="emerald"
      />
      <StatCardPremium
        title={"HEALTH MÉDIO"}
        value={avgHealthScore}
        suffix="%"
        status="Score Geral"
        iconName="Heart"
        colorVariant={avgHealthScore >= 70 ? 'emerald' : avgHealthScore >= 40 ? 'orange' : 'destructive'}
      />
      <StatCardPremium
        title={"LOGOS EM RISCO"}
        value={atRisk}
        status="Health Score < 40"
        iconName="AlertTriangle"
        colorVariant={atRisk > 0 ? 'destructive' : 'default'}
      />
      <StatCardPremium
        title={"RENOVAÇÕES (30D)"}
        value={renewalsSoon}
        status="Cycle Monitor"
        iconName="CalendarClock"
        colorVariant={renewalsSoon > 0 ? 'default' : 'default'}
      />
      <StatCardPremium
        title={"NPS SCORE"}
        value={npsScore ?? 0}
        prefix={npsScore !== null && npsScore > 0 ? '+' : ''}
        status={npsScore === null ? 'Sem dados' : npsScore >= 50 ? 'Excelente' : npsScore >= 0 ? 'Bom' : 'Crítico'}
        iconName="Star"
        colorVariant={npsScore === null ? 'default' : npsScore >= 50 ? 'emerald' : npsScore >= 0 ? 'orange' : 'destructive'}
      />
    </div>
  )
}
