'use client'

import { motion } from 'framer-motion'

interface ScoreBarProps {
  label: string
  count: number
  total: number
  color: string
}

export function ScoreBar({ label, count, total, color }: ScoreBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="label-premium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-background rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-content-primary text-[10px] font-extrabold w-8 text-right">{count}</span>
      <span className="text-content-secondary text-[9px] font-bold w-10 text-right">{pct}%</span>
    </div>
  )
}
