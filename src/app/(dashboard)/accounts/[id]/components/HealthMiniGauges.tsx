'use client'

import { Card } from "@/components/ui/card"
import { Zap, Ticket, Heart, MessageSquare, ShieldCheck, ShieldOff, Sparkles, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { HealthScore } from '@/lib/supabase/types'

interface HealthMiniGaugesProps {
  currentAdoptionScore?: number
  latestHealthScore?: HealthScore | null
  npsScore: number | null
  slaActive: boolean | null
  onShowReasoning?: (show: boolean) => void
  showReasoning: boolean
}

function HealthMiniGauge({ label, value, icon: Icon, color, index, displayLabel }: {
  label: string, value: number, icon: any, color: string, index: number, displayLabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.1) }}
      className="flex flex-col items-center justify-center gap-3 relative overflow-hidden rounded-2xl border border-border-divider bg-surface-background h-[120px] shadow-sm group hover:border-primary/30 transition-all"
    >
      <div
        className="absolute bottom-0 left-0 w-full transition-all duration-1000 z-0"
        style={{ height: `${Math.max(5, value)}%`, backgroundColor: color, opacity: 0.2 }}
      />
      <div className="absolute bottom-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: color, opacity: 0.5 }} />

      <Icon className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" style={{ color }} />

      <div className="text-center relative z-10 w-full px-1">
        <p className="label-premium !text-[9px] opacity-70 mb-1 truncate">{label}</p>
        <p className="text-sm font-black text-foreground leading-none tracking-tighter tabular-nums">
          {displayLabel ?? `${Math.round(value)}%`}
        </p>
      </div>
    </motion.div>
  )
}

export function HealthMiniGauges({
  currentAdoptionScore,
  latestHealthScore,
  npsScore,
  slaActive,
  onShowReasoning,
  showReasoning,
}: HealthMiniGaugesProps) {
  return (
    <Card variant="glass" className="lg:col-span-3 p-5 flex items-center justify-between gap-4 border-border shadow-2xl rounded-2xl overflow-hidden min-h-[160px]">
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
        <HealthMiniGauge index={0} label="Adoção" value={currentAdoptionScore ?? latestHealthScore?.engagement_component ?? 50} icon={Zap} color="#10b981" />
        <HealthMiniGauge index={1} label="Chamados" value={latestHealthScore?.ticket_component || 50} icon={Ticket} color="#f59e0b" />
        <HealthMiniGauge index={2} label="Relacionamento" value={latestHealthScore?.sentiment_component || 50} icon={Heart} color="hsl(var(--primary))" />

        <HealthMiniGauge
          index={3}
          label="NPS"
          value={npsScore === null ? 50 : Math.max(0, (npsScore + 100) / 2)}
          icon={MessageSquare}
          color={npsScore !== null && npsScore > 50 ? "#10b981" : "hsl(var(--primary))"}
          displayLabel={npsScore === null ? '—' : npsScore > 0 ? `+${npsScore}` : String(npsScore)}
        />

        <HealthMiniGauge
          index={4}
          label="SLA"
          value={slaActive === null ? 50 : slaActive ? 100 : 15}
          icon={slaActive ? ShieldCheck : ShieldOff}
          color={slaActive ? "#10b981" : "hsl(var(--destructive))"}
          displayLabel={slaActive === null ? '—' : slaActive ? 'OK' : 'Err.'}
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center justify-center gap-3 relative overflow-hidden rounded-2xl border border-border-divider bg-surface-background h-[120px] shadow-sm group hover:border-primary/30 transition-all cursor-pointer"
          onClick={() => latestHealthScore?.shadow_reasoning && onShowReasoning?.(!showReasoning)}
        >
          {latestHealthScore?.shadow_score != null ? (
            <>
              <div
                className="absolute bottom-0 left-0 w-full transition-all duration-1000 z-0"
                style={{ height: `${Math.max(5, latestHealthScore.shadow_score)}%`, backgroundColor: "hsl(var(--primary))", opacity: 0.2 }}
              />
              <div className="absolute bottom-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: "hsl(var(--primary))", opacity: 0.5 }} />
              <Sparkles className="w-6 h-6 relative z-10 text-primary animate-pulse" />
              <div className="text-center relative z-10 w-full px-1">
                <p className="label-premium !text-[9px] opacity-70 mb-1 truncate">Pontuação IA</p>
                <div className="flex items-center gap-1 justify-center">
                  <span className="text-sm font-black text-foreground leading-none tracking-tighter tabular-nums">
                    {Math.round(latestHealthScore.shadow_score)}
                  </span>
                  {latestHealthScore.shadow_reasoning && (
                    <Info className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="absolute bottom-0 left-0 w-full h-[5%] bg-muted-foreground opacity-10 z-0" />
              <Sparkles className="w-6 h-6 relative z-10 text-muted-foreground opacity-50" />
              <div className="text-center relative z-10 w-full px-1 opacity-50">
                <p className="label-premium !text-[9px] opacity-70 mb-1 truncate">Pontuação IA</p>
                <p className="text-xs font-black italic">Proc.</p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Card>
  )
}
