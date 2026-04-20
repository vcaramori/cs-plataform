'use client'

import { useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Send, CheckCircle2, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-10 rounded-3xl text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Obrigado!</h1>
          <p className="text-slate-400">
            Seu feedback foi registrado e nos ajudará a melhorar cada vez mais nossos serviços.
          </p>
          <div className="pt-4">
             <div className="h-1 w-20 bg-emerald-500/50 rounded-full mx-auto" />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-plannera-orange/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full glass rounded-[2.5rem] p-8 md:p-12 relative z-10 space-y-10"
      >
        <div className="text-center space-y-3">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-plannera-orange mb-2">Plannera Support</div>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">Como foi nossa ajuda hoje?</h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Sua avaliação é essencial para garantir a excelência no atendimento.</p>
        </div>

        {/* Rating Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Péssimo</span>
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Excelente</span>
          </div>
          <div className="flex justify-between gap-2 md:gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setScore(num)}
                className={`flex-1 h-14 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 relative group
                  ${score === num ? 'bg-plannera-orange text-white scale-105 shadow-[0_10px_30px_rgba(247,148,30,0.3)]' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
              >
                <Star className={`w-6 h-6 md:w-8 md:h-8 ${score === num ? 'fill-current' : 'fill-none group-hover:scale-110 transition-transform'}`} />
                {score === num && (
                   <motion.div 
                    layoutId="outline"
                    className="absolute inset-[-4px] border-2 border-plannera-orange/30 rounded-[1.4rem]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                   />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Section (Animate in after score selected) */}
        <AnimatePresence>
          {score !== null && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 40 }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comentário opcional</span>
              </div>
              <Textarea 
                placeholder="Conte-nos mais sobre o atendimento..."
                className="bg-black/20 border-white/10 text-white min-h-[120px] rounded-2xl focus:ring-plannera-orange/50 transition-all"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <Button 
                onClick={handleSubmit} 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-plannera-orange to-orange-600 hover:opacity-90 font-bold tracking-wide transition-all translate-y-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-shake">
            {error}
          </div>
        )}
      </motion.div>
    </div>
  )
}
