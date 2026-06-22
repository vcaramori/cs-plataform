'use client'

import Link from 'next/link'
import { Card } from "@/components/ui/card"
import { Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { DollarSign, Calendar } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatCurrency } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import { CommercialGovernance } from '@/lib/supabase/types'
import { calculateNetMRR, calculateCurrentDiscount } from '@/lib/utils/contract-utils'

interface RenewalCardProps {
  accountId: string
  activeContract?: any
  commercialGovernance: CommercialGovernance[]
}

export function RenewalCard({ accountId, activeContract, commercialGovernance }: RenewalCardProps) {
  const renewalDate = activeContract?.renewal_date ? new Date(activeContract.renewal_date + 'T12:00:00') : null
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null

  const renewalColor = !daysToRenewal ? 'text-content-secondary' :
    daysToRenewal < 30 ? 'text-destructive font-black' :
      daysToRenewal < 90 ? 'text-accent font-black' : 'text-emerald-500 font-black'

  const cardContent = (
    <Card 
      variant="glass" 
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border-border-divider/50 shadow-lg transition-all duration-300",
        "cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/30 hover:scale-[1.02] active:scale-95"
      )}
    >
      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/20 text-amber-600 dark:text-amber-500">
        <Calendar className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest mb-1 opacity-50 select-none">Renovação</Text>
        <Text className={cn("text-xl font-black tracking-tighter tabular-nums", renewalColor)}>
          {daysToRenewal !== null ? (daysToRenewal < 0 ? 'Expirado' : `em ${daysToRenewal}d`) : 'N/A'}
        </Text>
      </div>
    </Card>
  )

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link href={`/accounts/${accountId}/renewal`} className="focus:outline-none">
              {cardContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-background border-border shadow-2xl p-2.5">
            <span className="text-[10px] text-warning font-black uppercase tracking-widest">
              (PREPARAR RENOVAÇÃO)
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function MRRCard({ activeContracts, commercialGovernance }: {
  activeContracts: any[]
  commercialGovernance: CommercialGovernance[]
}) {
  let totalNetMRR = 0
  let totalNominalMRR = 0
  let totalDiscount = 0

  activeContracts.forEach(contract => {
    totalNetMRR += calculateNetMRR(contract, commercialGovernance)
    totalDiscount += calculateCurrentDiscount(contract, commercialGovernance)
    totalNominalMRR += Number(contract.mrr) || 0
  })

  return (
    <Card variant="glass" className="flex items-center gap-3 px-4 py-3 rounded-2xl border-border-divider/50 shrink-0 shadow-lg">
      <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-500">
        <DollarSign className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest mb-1 opacity-50 select-none">Receita Mensal (Líquida)</Text>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Text variant="primary" className="text-xl font-black tracking-tighter tabular-nums cursor-help">
                {formatCurrency(totalNetMRR)}
              </Text>
            </TooltipTrigger>
            {totalDiscount > 0 && (
              <TooltipContent side="bottom" className="bg-surface-card border-border-divider shadow-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-8">
                  <Text variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">Valor Nominal</Text>
                  <Text variant="primary" className="text-[10px] font-black">{formatCurrency(totalNominalMRR)}</Text>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <Text variant="accent" className="text-[10px] font-bold uppercase tracking-widest">Desconto Ativo</Text>
                  <Text variant="accent" className="text-[10px] font-black">-{formatCurrency(totalDiscount)}</Text>
                </div>
                <div className="h-px bg-border-divider/50" />
                <div className="flex items-center justify-between gap-8">
                  <Text className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Real MRR</Text>
                  <Text className="text-[10px] font-black text-emerald-500">{formatCurrency(totalNetMRR)}</Text>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
}
