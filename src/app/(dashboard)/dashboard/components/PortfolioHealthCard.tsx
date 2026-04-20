'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Building2, DollarSign, Heart, AlertTriangle, CalendarClock, Star } from 'lucide-react'
import { motion, useSpring, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  totalAccounts: number
  totalActiveContracts: number
  totalMRR: number
  avgHealthScore: number
  atRisk: number
  renewalsSoon: number
  npsScore: number | null
}

function Odometer({ value, prefix = "", suffix = "", decimal = 0 }: { value: number, prefix?: string, suffix?: string, decimal?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest)
    })
    return () => controls.stop()
  }, [value])

  return (
    <span>
      {prefix}{displayValue.toLocaleString('pt-BR', { minimumFractionDigits: decimal, maximumFractionDigits: decimal })}{suffix}
    </span>
  )
}

function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  sub, 
  color, 
  index,
  prefix,
  suffix,
  decimal
}: {
  icon: React.ElementType
  label: string
  value: number
  sub?: string
  color: string
  index: number
  prefix?: string
  suffix?: string
  decimal?: number
}) {
  const [bgClass, textClass] = color.split(' ')
  const barClass = textClass?.replace('text-', 'bg-') ?? 'bg-slate-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="h-full"
    >
      <Card className="glass-card group overflow-hidden relative h-full">
        <div className={cn(
          "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-[0.12] transition-opacity group-hover:opacity-25 pointer-events-none",
          barClass
        )} />

        <CardContent className="p-5 relative z-10 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide leading-none mb-2">{label}</p>
              <h3 className="text-2xl font-black text-white tracking-tighter">
                <Odometer value={value} prefix={prefix} suffix={suffix} decimal={decimal} />
              </h3>
              {sub && <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide opacity-70 mt-1 whitespace-nowrap">{sub}</p>}
            </div>
            <div className={cn("p-2.5 rounded-xl shadow-lg transition-transform group-hover:scale-110 shrink-0", bgClass, textClass)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 0.5 + (index * 0.1) }}
              className={cn("h-full opacity-60 rounded-full", barClass)}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
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

  const npsColor = npsScore === null
    ? 'bg-slate-800/10 text-slate-500'
    : npsScore >= 50 ? 'bg-emerald-600/10 text-emerald-400'
    : npsScore >= 0 ? 'bg-yellow-600/10 text-yellow-400'
    : 'bg-red-600/10 text-red-400'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
      <KPICard
        index={0}
        icon={Building2}
        label="TOTAL DE LOGOS"
        value={totalAccounts}
        sub={`${totalActiveContracts === 1 ? 'Conta' : 'Contas'}: ${totalActiveContracts}`}
        color="bg-indigo-600/10 text-indigo-400"
      />
      <KPICard
        index={1}
        icon={DollarSign}
        label="MRR Total"
        value={isMrrMillion ? totalMRR / 1000000 : totalMRR}
        prefix="R$ "
        decimal={isMrrMillion ? 3 : 0}
        suffix={isMrrMillion ? ' Mi' : ''}
        sub={
          isArrMillion
            ? `ARR: R$ ${((totalMRR * 12) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Mi`
            : `ARR: R$ ${(totalMRR * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        }
        color="bg-emerald-600/10 text-emerald-400"
      />
      <KPICard
        index={2}
        icon={Heart}
        label="Health Médio"
        value={avgHealthScore}
        suffix="%"
        sub="Score Geral"
        color={avgHealthScore >= 70 ? 'bg-emerald-600/10 text-emerald-400' : avgHealthScore >= 40 ? 'bg-yellow-600/10 text-yellow-400' : 'bg-red-600/10 text-red-400'}
      />
      <KPICard
        index={3}
        icon={AlertTriangle}
        label="LOGOS em Risco"
        value={atRisk}
        sub="Health Score < 40"
        color={atRisk > 0 ? 'bg-red-600/10 text-red-500' : 'bg-slate-800/10 text-slate-500'}
      />
      <KPICard
        index={4}
        icon={CalendarClock}
        label="Renovações (30d)"
        value={renewalsSoon}
        sub="Cycle Monitor"
        color={renewalsSoon > 0 ? 'bg-orange-600/10 text-orange-400' : 'bg-slate-800/10 text-slate-500'}
      />
      <KPICard
        index={5}
        icon={Star}
        label="NPS Score"
        value={npsScore ?? 0}
        prefix={npsScore !== null && npsScore > 0 ? '+' : ''}
        sub={npsScore === null ? 'Sem dados' : npsScore >= 50 ? 'Excelente' : npsScore >= 0 ? 'Bom' : 'Crítico'}
        color={npsColor}
      />
    </div>
  )
}
