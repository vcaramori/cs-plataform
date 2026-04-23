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
  // Versão saturada para Light Mode (removendo o /10 e ajustando tons se necessário)
  const barClass = textClass?.replace('text-', 'bg-') ?? 'bg-muted'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="h-full"
    >
      <Card variant="premium" className="group overflow-hidden relative h-full border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm shadow-slate-200/50 dark:shadow-none min-h-[165px]">
        <div className={cn(
          "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-[0.03] dark:opacity-10 transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20 pointer-events-none",
          barClass
        )} />

        <CardContent className="p-4 relative z-10 h-full flex flex-col justify-between">
          {/* Cabeçalho: Título e Ícone */}
          <div className="flex justify-between items-start w-full gap-2">
            <p className="text-[#2d3558] dark:text-slate-400 text-[10px] font-extrabold uppercase tracking-widest leading-tight opacity-90 dark:opacity-80 min-h-[2rem] whitespace-pre-line">
              {label}
            </p>
            <div className={cn("w-10 h-10 rounded-xl shadow-sm dark:shadow-glow transition-all duration-300 group-hover:scale-110 shrink-0 flex items-center justify-center border border-slate-100 dark:border-white/5", bgClass, textClass)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          {/* Centro: Valor Principal */}
          <div className="flex-1 flex items-center py-2">
            <h3 className="text-3xl font-extrabold text-[#2d3558] dark:text-white tracking-tighter">
              <Odometer value={value} prefix={prefix} suffix={suffix} decimal={decimal} />
            </h3>
          </div>

          {/* Rodapé: Texto de Apoio e Barra Inferior */}
          <div className="space-y-3">
            {sub && <p className="text-[#5c5b5b] dark:text-slate-500 text-[10px] font-bold uppercase tracking-wide opacity-90 dark:opacity-80 whitespace-nowrap">{sub}</p>}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.5 + (index * 0.1) }}
                className={cn("h-full rounded-full", barClass)}
              />
            </div>
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
    ? 'bg-muted/50 text-muted-foreground'
    : npsScore >= 50 ? 'bg-emerald-600/10 text-emerald-500'
    : npsScore >= 0 ? 'bg-yellow-600/10 text-yellow-500'
    : 'bg-destructive/10 text-destructive'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        index={0}
        icon={Building2}
        label={"TOTAL DE\nLOGOS"}
        value={totalAccounts}
        sub={`${totalActiveContracts === 1 ? 'Conta' : 'Contas'}: ${totalActiveContracts}`}
        color="bg-primary/10 text-primary"
      />
      <KPICard
        index={1}
        icon={DollarSign}
        label={"MRR TOTAL\n(R$)"}
        value={isMrrMillion ? totalMRR / 1000000 : totalMRR}
        decimal={isMrrMillion ? 3 : 0}
        suffix={isMrrMillion ? ' Mi' : ''}
        sub={
          isArrMillion
            ? `ARR: R$ ${((totalMRR * 12) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Mi`
            : `ARR: R$ ${(totalMRR * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        }
        color="bg-emerald-600/10 text-emerald-500"
      />
      <KPICard
        index={2}
        icon={Heart}
        label={"HEALTH\nMÉDIO"}
        value={avgHealthScore}
        suffix="%"
        sub="Score Geral"
        color={avgHealthScore >= 70 ? 'bg-emerald-600/10 text-emerald-500' : avgHealthScore >= 40 ? 'bg-yellow-600/10 text-yellow-500' : 'bg-destructive/10 text-destructive'}
      />
      <KPICard
        index={3}
        icon={AlertTriangle}
        label={"LOGOS EM\nRISCO"}
        value={atRisk}
        sub="Health Score < 40"
        color={atRisk > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground'}
      />
      <KPICard
        index={4}
        icon={CalendarClock}
        label={"RENOVAÇÕES\n(30D)"}
        value={renewalsSoon}
        sub="Cycle Monitor"
        color={renewalsSoon > 0 ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}
      />
      <KPICard
        index={5}
        icon={Star}
        label={"NPS\nSCORE"}
        value={npsScore ?? 0}
        prefix={npsScore !== null && npsScore > 0 ? '+' : ''}
        sub={npsScore === null ? 'Sem dados' : npsScore >= 50 ? 'Excelente' : npsScore >= 0 ? 'Bom' : 'Crítico'}
        color={npsColor}
      />
    </div>
  )
}
