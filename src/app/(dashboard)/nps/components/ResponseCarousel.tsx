'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ResponseCarouselProps {
  ansList: any[]
  scoreColor: string
}

export default function ResponseCarousel({ ansList, scoreColor }: ResponseCarouselProps) {
  const [idx, setIdx] = useState(0)
  const validAnswers = ansList.filter(a => a.is_comment || a.text_value || (a.selected_options && a.selected_options.length > 0))

  useEffect(() => {
    if (validAnswers.length <= 1) return
    const timer = setInterval(() => setIdx(prev => (prev + 1) % validAnswers.length), 5000)
    return () => clearInterval(timer)
  }, [validAnswers.length])

  if (validAnswers.length === 0) return <p className="label-premium opacity-30 italic">Sem comentários registrados</p>

  const ans = validAnswers[idx]
  const qTitle = ans.is_comment ? 'Feedback Direto' : (ans.nps_questions?.title || 'Resposta')
  const val = ans.is_comment ? ans.text_value : (ans.nps_questions?.type === 'multiple_choice'
    ? (ans.selected_options || []).join(', ')
    : ans.text_value)

  return (
    <div className="relative h-10 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0 flex flex-col justify-center">
          <span className={cn("label-premium !text-[8px] opacity-60 mb-0.5", scoreColor)}>{qTitle}</span>
          <span className="text-foreground font-medium text-[11px] truncate leading-tight tracking-tight" title={val}>{val}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
