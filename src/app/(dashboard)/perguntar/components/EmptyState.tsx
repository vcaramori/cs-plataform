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
      className="flex flex-col items-center justify-center min-h-[400px] max-w-5xl mx-auto w-full gap-12"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center relative shadow-2xl overflow-hidden group">
            <Sparkles className="w-10 h-10 text-plannera-orange group-hover:scale-110 transition-transform duration-500" />
          </div>
        </div>

        <div className="text-center space-y-3">
          <h2 className="text-4xl font-heading font-black text-content-primary uppercase tracking-tight leading-none">
            Como posso <span className="text-plannera-orange">ajudar</span> hoje?
          </h2>
          <p className="text-content-secondary text-[11px] font-bold uppercase tracking-[0.4em] opacity-50">
            Sua IA de Portfólio Estratégico e Customer Success
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        <div className="col-span-full flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-plannera-orange" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Sugestões de Análise</span>
        </div>
        {exampleQuestions.map((q, idx) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setInput(q)}
            className="group flex flex-col justify-between text-left bg-surface-card hover:bg-plannera-orange border border-border-divider hover:border-plannera-orange p-6 rounded-2xl transition-all shadow-sm hover:shadow-plannera-orange/20"
          >
            <span className="text-[12px] font-black uppercase tracking-tight leading-relaxed text-content-primary group-hover:text-white transition-colors">{q}</span>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[9px] font-bold text-content-secondary/40 group-hover:text-white/40 uppercase tracking-widest">Tentar</span>
              <ChevronRight className="w-4 h-4 text-plannera-orange group-hover:text-white translate-x-0 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
