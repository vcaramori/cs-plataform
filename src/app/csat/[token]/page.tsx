'use client'

import { useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Send, CheckCircle2, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function CSATPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = use(paramsPromise)
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (score === null) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const res = await fetch('/api/csat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, score, comment })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar resposta')

      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-plannera-primary relative overflow-hidden">
        {/* Success Background Accents */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-12 rounded-2xl text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-heading font-black text-white uppercase tracking-tight">Obrigado!</h1>
            <p className="text-content-secondary text-sm leading-relaxed">
              Seu feedback foi registrado e nos ajudará a melhorar cada vez mais nossos serviços de Customer Success.
            </p>
          </div>
          <div className="pt-6">
             <div className="h-1 w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full mx-auto" />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-plannera-primary relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-plannera-orange/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-plannera-sop/5 blur-[140px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full glass-card rounded-2xl p-10 md:p-14 relative z-10 space-y-12 border border-white/5 shadow-2xl"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-plannera-orange/10 border border-plannera-orange/20 text-[9px] font-black uppercase tracking-[0.4em] text-plannera-orange mb-4 shadow-sm">
            <Sparkles className="w-3 h-3" />
            Feedback Plannera
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-black text-white leading-none tracking-tight">Como foi nossa ajuda hoje?</h1>
          <p className="text-content-secondary/80 text-sm md:text-base max-w-sm mx-auto leading-relaxed">Sua avaliação é essencial para garantir a excelência no atendimento estratégico.</p>
        </div>

        {/* Rating Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center px-4">
             <span className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em] opacity-60">Insatisfeito</span>
             <span className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em] opacity-60">Muito Satisfeito</span>
          </div>
          <div className="flex justify-between gap-3 md:gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setScore(num)}
                className={`flex-1 h-16 md:h-24 rounded-2xl flex items-center justify-center transition-all duration-500 relative group border
                  ${score === num 
                    ? 'bg-plannera-orange text-white scale-105 shadow-[0_15px_40px_rgba(247,148,30,0.4)] border-plannera-orange' 
                    : 'bg-white/5 text-content-secondary border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
              >
                <Star className={`w-7 h-7 md:w-10 md:h-10 ${score === num ? 'fill-current' : 'fill-none group-hover:scale-110 transition-transform'}`} />
                {score === num && (
                   <motion.div 
                    layoutId="outline"
                    className="absolute inset-[-6px] border-2 border-plannera-orange/20 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
                   />
                )}
                <span className={cn(
                  "absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black transition-all",
                  score === num ? "opacity-100 translate-y-4" : "opacity-0 translate-y-2"
                )}>{num}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comment Section (Animate in after score selected) */}
        <AnimatePresence>
          {score !== null && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 48 }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-2 px-2">
                <MessageSquare className="w-4 h-4 text-plannera-orange" />
                <span className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em]">Comentário opcional</span>
              </div>
              <Textarea 
                placeholder="Conte-nos mais sobre sua experiência de atendimento..."
                className="bg-black/30 border-white/10 text-white min-h-[140px] rounded-2xl focus:ring-plannera-orange/40 focus:border-plannera-orange/40 transition-all text-base p-6 placeholder:text-content-secondary/30"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <Button 
                onClick={handleSubmit} 
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-plannera-orange to-orange-600 hover:opacity-90 font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-plannera-orange/30 transition-all active:scale-[0.98] group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Enviar Avaliação
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
