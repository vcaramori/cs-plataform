import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, CalendarDays, Clock, DollarSign } from 'lucide-react'
import type { CommercialGovernance, Contract } from '@/lib/supabase/types'
import { ContractHistoryDialog } from './ContractHistoryDialog'
import { EditContractDialog } from './EditContractDialog'
import { calculateNetMRR, calculateCurrentDiscount } from '@/lib/utils/contract-utils'
import { ShieldCheck, Scale, TrendingDown, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const diff = date.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ContractCard({ activeContract, allContracts, accountId, governanceRules = [] }: { 
  activeContract: Contract, 
  allContracts: Contract[],
  accountId: string,
  governanceRules?: CommercialGovernance[]
}) {
  if (!activeContract) return null

  const contract = activeContract
  const days = daysUntil(contract.renewal_date)
  const renewalColor = days === null ? 'text-content-secondary' : days < 30 ? 'text-red-400' : days < 90 ? 'text-yellow-400' : 'text-emerald-400'

  const netMRR = calculateNetMRR(contract, governanceRules)
  const discount = calculateCurrentDiscount(contract, governanceRules)
  const hasDiscount = discount > 0
  const contractGovernanceRules = governanceRules.filter((rule) => rule.contract_id === contract.id || !rule.contract_id)
  const fidelityRule = contractGovernanceRules.find((rule) => rule.rule_type === 'fidelity' || rule.sub_type === 'fidelity_penalty')
  const penaltyRule = contractGovernanceRules.find((rule) => rule.rule_type === 'penalty')

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'at-risk': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    churned: 'bg-red-500/20 text-red-300 border-red-500/30',
    'in-negotiation': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-content-primary text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> {contract.description || 'Contrato Ativo'}
          </CardTitle>
          <div className="flex items-center gap-3">
            <ContractHistoryDialog contractId={contract.id} contractName={contract.description || 'Contrato'} />
            <Badge className={`text-xs border ${statusColors[contract.status] ?? ''}`}>
              {contract.service_type}
            </Badge>
          </div>
        </div>
        <div className="flex justify-end mt-2">
           {/* EditContractDialog foi extraído do History para cá para permitir Lançar Aditivos diretamente */}
           <EditContractDialog contract={contract} triggerText="Atualizar / Aditivo" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-background rounded-lg p-3 relative group/mrr">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-content-secondary text-xs uppercase font-extrabold tracking-widest">MRR Real</span>
              </div>
              {hasDiscount && (
                <Badge variant="neutral" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] h-4 font-black">
                  -{Math.round((discount / contract.mrr) * 100)}%
                </Badge>
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-content-primary font-black text-xl tracking-tighter">R$ {netMRR.toLocaleString('pt-BR')}</p>
              {hasDiscount && (
                <div className="flex items-center gap-1.5 mt-1 opacity-60 group-hover/mrr:opacity-100 transition-opacity">
                  <span className="text-[10px] text-content-secondary line-through">R$ {Number(contract.mrr).toLocaleString('pt-BR')}</span>
                  <span className="text-[10px] text-content-secondary font-bold">(Nominal)</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-surface-background rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-content-secondary text-xs">Renovação</span>
            </div>
            <p className={`font-bold text-lg ${renewalColor}`}>
              {contract.renewal_date ? new Date(contract.renewal_date).toLocaleDateString('pt-BR') : 'N/A'}
            </p>
            <p className="text-content-secondary text-xs">
              {days === null ? 'Sem data' : days > 0 ? `em ${days} dias` : `${Math.abs(days)} dias atrás`}
            </p>
          </div>
        </div>

        {/* Governança Row */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-divider">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-content-secondary font-extrabold uppercase tracking-widest">Fidelização</span>
              <span className="text-xs font-bold text-content-primary">
                {fidelityRule?.ends_at ? new Date(fidelityRule.ends_at).toLocaleDateString('pt-BR') : 'N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-content-secondary font-extrabold uppercase tracking-widest">Multa Rescisória</span>
              <span className="text-xs font-bold text-content-primary">
                {penaltyRule?.value ? `R$ ${Number(penaltyRule.value).toLocaleString('pt-BR')}` : 'Isento'}
              </span>
            </div>
          </div>
        </div>

        {/* Hierarchical Governance Info */}
        <div className="mt-4 space-y-2">
          {contractGovernanceRules.map((rule, ri) => (
            <div key={ri} className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span className="text-[9px] font-bold text-content-primary uppercase tracking-tight">{rule.label}</span>
              </div>
              <Badge variant="neutral" className="text-[8px] font-black h-4 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                {rule.rule_type === 'discount' ? '-' : ''}
                {rule.sub_type === 'percentage' ? `${rule.value}%` : `R$ ${rule.value.toLocaleString('pt-BR')}`}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
