'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { LEVEL_LABEL, LEVEL_HEX, TREATMENT_LABEL, TREATMENT_BADGE, brlCompact, type AccountRiskProfile, type RiskLevel } from './risk-types'

const COLS: { level: RiskLevel; sub: string }[] = [
  { level: 'critical', sub: 'Ação imediata' },
  { level: 'high', sub: 'Prioridade alta' },
  { level: 'medium', sub: 'Monitorar' },
  { level: 'low', sub: 'Atenção leve' },
]

export function RiskKanban({ accounts }: { accounts: AccountRiskProfile[] }) {
  const data = accounts.filter(a => !a.curatedFalsePositive)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {COLS.map(({ level, sub }) => {
        const items = data.filter(a => a.riskLevel === level)
        return (
          <div key={level} className="rounded-2xl border border-border-divider bg-surface-card/40 overflow-hidden flex flex-col">
            <div className="px-3 py-2.5 border-b border-border-divider flex items-center justify-between" style={{ borderTop: `3px solid ${LEVEL_HEX[level]}` }}>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-content-primary">{LEVEL_LABEL[level]}</p>
                <p className="text-[9px] uppercase tracking-wide text-content-secondary">{sub}</p>
              </div>
              <Badge className="border-none text-[10px] font-black" style={{ backgroundColor: `${LEVEL_HEX[level]}22`, color: LEVEL_HEX[level] }}>{items.length}</Badge>
            </div>
            <div className="p-2 space-y-2 max-h-[26rem] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-[11px] text-content-secondary/60 text-center py-6">—</p>
              ) : items.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Link href={`/accounts/${a.id}`}>
                    <Card className="p-3 hover:shadow-md transition-all border-border-divider">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-[12px] uppercase tracking-tight text-content-primary truncate">{a.name}</p>
                        <ArrowRight className="w-3.5 h-3.5 text-content-secondary shrink-0" />
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-content-secondary">
                        <span>Health <b className="text-content-primary">{a.health ?? '—'}</b></span>
                        {a.aiRisk != null && <span>· Risco IA <b className="text-content-primary">{a.aiRisk}</b></span>}
                        {a.arr > 0 && <span>· {brlCompact(a.arr)}</span>}
                      </div>
                      {a.reasons[0] && <p className="mt-1 text-[11px] text-content-secondary line-clamp-1">{a.reasons[0]}</p>}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-[8px] uppercase border-none ${TREATMENT_BADGE[a.treatment]}`}>{TREATMENT_LABEL[a.treatment]}</Badge>
                        {a.owner_name && <Badge variant="outline" className="text-[8px] uppercase text-content-secondary">{a.owner_name}</Badge>}
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
