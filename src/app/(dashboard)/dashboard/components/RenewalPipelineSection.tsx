'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, Calendar, TrendingUp, DollarSign, ChevronDown, ChevronRight } from 'lucide-react'

interface RenewalCard {
  account_id: string
  account_name: string
  arr: number
  health_score: number
  nps: number | null
  readiness_color: 'green' | 'yellow' | 'red'
  days_to_renewal: number
}

interface RenewalPipeline {
  critico: RenewalCard[]
  urgente: RenewalCard[]
  planejamento: RenewalCard[]
}

const COLUMNS = [
  {
    key: 'critico' as const,
    label: 'Crítico',
    sublabel: '< 30 dias',
    border: 'border-t-red-500',
    badge: 'bg-red-500/10 text-red-600 border-red-500/20',
    dot: 'bg-red-500',
    glow: 'from-red-500/5 to-transparent',
  },
  {
    key: 'urgente' as const,
    label: 'Urgente',
    sublabel: '30–60 dias',
    border: 'border-t-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    dot: 'bg-amber-500',
    glow: 'from-amber-500/5 to-transparent',
  },
  {
    key: 'planejamento' as const,
    label: 'Planejamento',
    sublabel: '60–90 dias',
    border: 'border-t-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    dot: 'bg-blue-500',
    glow: 'from-blue-500/5 to-transparent',
  },
]

const READINESS = {
  green: { label: 'Pronto', cls: 'bg-emerald-500/10 text-emerald-600' },
  yellow: { label: 'Atenção', cls: 'bg-amber-500/10 text-amber-600' },
  red: { label: 'Risco', cls: 'bg-red-500/10 text-red-600' },
}

function RenewalCard({ card, idx }: { card: RenewalCard; idx: number }) {
  const readiness = READINESS[card.readiness_color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
    >
      <Link
        href={`/accounts/${card.account_id}/renewal`}
        className="block p-2.5 pb-2 bg-surface-background hover:bg-surface-card border border-border-divider rounded-lg transition-all hover:shadow-md hover:border-border-divider/60 group"
      >
        {/* Line 1: Client Name & Readiness Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <p className="font-bold text-[11px] text-content-primary leading-tight group-hover:text-plannera-orange transition-colors line-clamp-1 max-w-[120px]">
            {card.account_name}
          </p>
          <Badge className={`text-[8px] font-bold uppercase tracking-wider shrink-0 h-4 px-1.5 flex items-center justify-center rounded-md border-none ${readiness.cls}`}>
            {readiness.label}
          </Badge>
        </div>

        {/* Line 2: Renewal Days & ARR (Compact Grid/Flex) */}
        <div className="flex items-center justify-between text-[9px] text-content-secondary gap-1.5 mb-1">
          <div className="flex items-center gap-1 min-w-[70px]">
            <Calendar className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">
              {card.days_to_renewal < 0 
                ? `Vencido ${Math.abs(card.days_to_renewal)}d` 
                : `${card.days_to_renewal}d`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-2.5 h-2.5 shrink-0 text-content-secondary/70" />
            <span className="font-medium">ARR: R$ {card.arr.toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Line 3: Health Score & NPS (No border, inline compact) */}
        <div className="flex items-center gap-2.5 text-[9px]">
          <div className="flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-content-secondary shrink-0" />
            <span className={card.health_score >= 70 ? 'text-emerald-600 font-extrabold' : card.health_score >= 50 ? 'text-amber-600 font-extrabold' : 'text-red-600 font-extrabold'}>
              {card.health_score}%
            </span>
            <span className="text-content-secondary/70">health</span>
          </div>
          {card.nps !== null && (
            <div className="text-content-secondary/70">
              NPS <span className="font-extrabold text-content-primary">{card.nps}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

export default function RenewalPipelineSection() {
  const [pipeline, setPipeline] = useState<RenewalPipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/renewal-pipeline')
      .then(r => r.json())
      .then(data => {
        if (data?.critico && data?.urgente && data?.planejamento) {
          setPipeline(data)
          const t = data.critico.length + data.urgente.length + data.planejamento.length
          setCollapsed(t === 0)
        } else {
          setPipeline({ critico: [], urgente: [], planejamento: [] })
          setCollapsed(true)
        }
      })
      .catch(() => {
        setPipeline({ critico: [], urgente: [], planejamento: [] })
        setCollapsed(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const total = pipeline ? pipeline.critico.length + pipeline.urgente.length + pipeline.planejamento.length : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Pipeline de Renovações" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="h-32 bg-surface-card border border-border-divider rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Pipeline de Renovações"
          subtitle={total > 0 ? `${total} conta${total !== 1 ? 's' : ''} nos próximos 90 dias` : 'Nenhuma renovação nos próximos 90 dias'}
        />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-content-secondary/60 hover:text-content-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-surface-card border border-transparent hover:border-border-divider"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {collapsed ? 'Expandir' : 'Recolher'}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COLUMNS.map(col => {
                const items = (pipeline ?? { critico: [], urgente: [], planejamento: [] })[col.key]
                return (
                  <div key={col.key} className="space-y-3">
                    <div className={`p-4 bg-surface-card border-t-2 border border-border-divider rounded-2xl bg-gradient-to-b ${col.glow} min-h-[120px]`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">{col.label}</p>
                          <p className="text-[9px] text-content-secondary/60 mt-0.5">{col.sublabel}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.badge}`}>
                          {items.length}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {items.map((card, idx) => (
                            <RenewalCard key={card.account_id} card={card} idx={idx} />
                          ))}
                        </AnimatePresence>
                        {items.length === 0 && (
                          <p className="text-[10px] text-content-secondary text-center py-4">Nenhuma conta</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
