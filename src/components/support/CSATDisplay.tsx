'use client'

import { Star, MessageSquare, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CSATResponse {
  score: number
  comment?: string | null
  answered_at: string
}

interface CSATDisplayProps {
  response: CSATResponse | null
  tokenExpired?: boolean
}

export function CSATDisplay({ response, tokenExpired }: CSATDisplayProps) {
  if (!response) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Star className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">CSAT</span>
        </div>
        <p className="text-sm text-slate-500">
          {tokenExpired ? 'Prazo de avaliação expirado sem resposta.' : 'Aguardando avaliação do cliente.'}
        </p>
      </div>
    )
  }

  const scoreColor = response.score >= 4
    ? 'text-emerald-400'
    : response.score === 3
    ? 'text-amber-400'
    : 'text-red-400'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Star className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">CSAT</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className={`w-4 h-4 ${s <= response.score ? `${scoreColor} fill-current` : 'text-slate-700'}`}
            />
          ))}
          <span className={`text-sm font-bold ml-1 ${scoreColor}`}>{response.score}/5</span>
        </div>
      </div>

      {response.comment && (
        <div className="flex items-start gap-2 text-slate-400">
          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 italic">"{response.comment}"</p>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3" />
        <span>Respondido em {format(new Date(response.answered_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
      </div>
    </div>
  )
}

