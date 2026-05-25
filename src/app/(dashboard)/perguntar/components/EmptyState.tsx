'use client'

import { motion } from 'framer-motion'
import { Sparkles, Lightbulb, ChevronRight } from 'lucide-react'

interface EmptyStateProps {
  setInput: (input: string) => void
  exampleQuestions: string[]
}

export function EmptyState({ setInput, exampleQuestions }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center flex-1 max-w-5xl mx-auto w-full gap-5 py-4"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-plannera-orange" />
        </div>

        <div className="text-center space-y-0.5">
          <h2 className="text-xl font-heading font-black text-content-primary uppercase tracking-tight leading-none">
            Como posso <span className="text-plannera-orange">ajudar</span> hoje?
          </h2>
          <p className="text-content-secondary text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">
            Sua IA de Portfólio Estratégico e Customer Success
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        <div className="col-span-full flex items-center gap-2 mb-0.5">
          <Lightbulb className="w-3 h-3 text-plannera-orange" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-content-secondary">Sugestões de Análise</span>
        </div>
        {exampleQuestions.map((q, idx) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            onClick={() => setInput(q)}
            className="group flex flex-col justify-between text-left bg-surface-card hover:bg-plannera-orange border border-border-divider hover:border-plannera-orange p-3 rounded-xl transition-all shadow-sm hover:shadow-plannera-orange/20"
          >
            <span className="text-[10px] font-black uppercase tracking-tight leading-snug text-content-primary group-hover:text-white transition-colors">{q}</span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] font-bold text-content-secondary/40 group-hover:text-white/40 uppercase tracking-widest">Tentar</span>
              <ChevronRight className="w-3 h-3 text-plannera-orange group-hover:text-white translate-x-0 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
