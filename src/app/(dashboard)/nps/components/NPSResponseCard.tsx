'use client'

import { motion } from 'framer-motion'
import { Building2, Sparkles } from 'lucide-react'
import { getNPSSegment } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import ResponseCarousel from './ResponseCarousel'

interface NPSResponseCardProps {
  response: any
  index: number
  onSelect: () => void
}

export function NPSResponseCard({ response, index, onSelect }: NPSResponseCardProps) {
  const seg = response.score !== null ? getNPSSegment(response.score) : null
  const segColor = seg === 'promoter' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : seg === 'passive' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-destructive border-destructive/20 bg-destructive/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      className="flex items-stretch gap-8 p-8 rounded-2xl bg-surface-card border border-border-divider cursor-pointer hover:bg-surface-background hover:border-plannera-primary/30 transition-all group overflow-hidden relative shadow-lg shadow-black/5"
    >
      <div className={cn("flex flex-col items-center justify-center w-20 rounded-2xl border-2 font-black shrink-0 shadow-xl transition-all group-hover:scale-105 group-hover:rotate-2", segColor)}>
        <span className="text-[8px] opacity-40 uppercase leading-none mb-1.5 font-black tracking-widest">Score</span>
        <span className="text-3xl leading-none tracking-tighter tabular-nums">{response.score}</span>
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-content-primary text-[11px] font-black truncate group-hover:text-plannera-primary transition-all uppercase tracking-[0.1em]">{response.user_email || 'ANÔNIMO'}</span>
          <span className="text-[9px] font-black text-content-secondary/30 ml-auto shrink-0 flex items-center gap-2 uppercase tracking-widest">
            {response.responded_at ? new Date(response.responded_at).toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>

        <div className="px-5 py-3.5 rounded-2xl bg-surface-background/50 border border-border-divider shadow-inner group-hover:border-plannera-primary/20 transition-all">
          <ResponseCarousel
            ansList={response.comment ? [{ is_comment: true, text_value: response.comment }, ...(response.nps_answers || [])] : (response.nps_answers || [])}
            scoreColor={seg === 'promoter' ? 'text-emerald-500' : seg === 'passive' ? 'text-amber-500' : 'text-destructive'}
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Building2 className="w-3.5 h-3.5 text-content-secondary/20" />
          <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary/40 group-hover:text-plannera-primary/40 transition-colors truncate">{response.account_name}</p>
        </div>
      </div>

      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-10 transition-all duration-500 ease-out">
        <div className="w-12 h-12 rounded-2xl bg-plannera-primary flex items-center justify-center shadow-2xl shadow-plannera-primary/30">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}
