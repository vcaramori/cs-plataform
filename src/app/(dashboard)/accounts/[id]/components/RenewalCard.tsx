'use client'

import Link from 'next/link'
import { Card } from "@/components/ui/card"
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

  const renewalColor = !daysToRenewal ? 'text-muted-foreground' :
    daysToRenewal < 30 ? 'text-destructive font-black' :
      daysToRenewal < 90 ? 'text-amber-500' : 'text-emerald-500'

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <Card variant="glass" className="flex items-center gap-3 px-4 py-3 rounded-2xl border-border/50 shadow-lg">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
          <Calendar className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex flex-col">
          <span className="label-premium !text-[9px] opacity-50 mb-1">Renovação</span>
          <span className={cn("text-xl font-black tracking-tighter tabular-nums", renewalColor)}>
            {daysToRenewal !== null ? (daysToRenewal < 0 ? 'Expirado' : `em ${daysToRenewal}d`) : 'N/A'}
          </span>
        </div>
      </Card>
      {daysToRenewal !== null && daysToRenewal <= 90 && (
        <Link href={`/accounts/${accountId}/renewal`}>
          <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest h-10 rounded-xl">
            Preparar Renovação
          </Button>
        </Link>
      )}
    </div>
  )
}

export function MRRCard({ activeContract, commercialGovernance }: {
  activeContract?: any
  commercialGovernance: CommercialGovernance[]
}) {
  const netMRR = calculateNetMRR(activeContract, commercialGovernance)
  const currentDiscount = calculateCurrentDiscount(activeContract, commercialGovernance)

  return (
    <Card variant="glass" className="flex items-center gap-3 px-4 py-3 rounded-2xl border-border/50 shrink-0 shadow-lg">
      <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
        <DollarSign className="w-5 h-5 text-emerald-500" />
      </div>
      <div className="flex flex-col">
        <span className="label-premium !text-[9px] opacity-50 mb-1">Receita Mensal (Líquida)</span>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="text-xl font-black text-foreground tracking-tighter tabular-nums cursor-help">
                {formatCurrency(netMRR)}
              </span>
            </TooltipTrigger>
            {currentDiscount > 0 && (
              <TooltipContent side="bottom" className="bg-background border-border shadow-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Valor Nominal</span>
                  <span className="text-[10px] font-black text-foreground">{formatCurrency(activeContract.mrr)}</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Desconto Ativo</span>
                  <span className="text-[10px] font-black text-amber-500">-{formatCurrency(currentDiscount)}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between gap-8">
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Real MRR</span>
                  <span className="text-[10px] font-black text-emerald-500">{formatCurrency(netMRR)}</span>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
}
