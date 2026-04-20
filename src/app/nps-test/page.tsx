'use client'

import { useState, useEffect } from 'react'
import { toast, Toaster } from 'sonner'
import type { NPSQuestion } from '@/lib/supabase/types'

// Página temporária de teste do widget NPS.
// Abre a pesquisa automaticamente, sempre, sem verificar recorrência ou localStorage.
// REMOVER quando não precisar mais.

type Answer = {
  question_id: string
  text_value?: string | null
  selected_options?: string[] | null
}

function NPSScaleQuestion({ q, onChange }: { q: NPSQuestion; onChange: (a: Answer) => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            onClick={() => { setSelected(n); onChange({ question_id: q.id, text_value: String(n) }) }}
            className={`flex-1 h-9 rounded-lg border text-xs font-black transition-all ${
              selected === n
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-transparent border-white/10 text-slate-500 hover:border-orange-500/40 hover:text-white'
            }`}
          >{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-600">
        <span>Pouco provável</span><span>Muito provável</span>
      </div>
    </div>
  )
}

function MultipleChoiceQuestion({ q, onChange }: { q: NPSQuestion; onChange: (a: Answer) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  function toggle(opt: string) {
    const next = selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]
    setSelected(next)
    onChange({ question_id: q.id, selected_options: next.length > 0 ? next : null })
  }
  return (
    <div className="space-y-2">
      {(q.options ?? []).map(opt => (
        <button key={opt} onClick={() => toggle(opt)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
            selected.includes(opt)
              ? 'border-orange-500/60 bg-orange-500/10 text-white'
              : 'border-white/8 text-slate-400 hover:border-white/15 hover:text-slate-300'
          }`}>
          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
            selected.includes(opt) ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
          }`} />
          <span className="text-xs font-medium">{opt}</span>
        </button>
      ))}
    </div>
  )
}

function TextQuestion({ q, onChange }: { q: NPSQuestion; onChange: (a: Answer) => void }) {
  return (
    <textarea rows={2} placeholder="Digite aqui..."
      onChange={e => onChange({ question_id: q.id, text_value: e.target.value.trim() || null })}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-slate-300 text-xs resize-none outline-none placeholder:text-slate-600 focus:border-orange-500/30 font-sans"
    />
  )
}

export default function NPSTestPage() {
  const [programKey, setProgramKey] = useState('')
  const [email, setEmail] = useState('teste@plannera.com.br')
  const [questions, setQuestions] = useState<NPSQuestion[]>([])
  const [loadingQ, setLoadingQ] = useState(false)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Carrega as perguntas do programa quando a key é preenchida
  useEffect(() => {
    if (!programKey.trim()) { setQuestions([]); return }
    const timer = setTimeout(async () => {
      setLoadingQ(true)
      try {
        const res = await fetch(`/api/nps/check?program_key=${encodeURIComponent(programKey.trim())}&email=${encodeURIComponent(email)}`)
        const data = await res.json()
        if (data.program?.questions?.length > 0) {
          setQuestions(data.program.questions)
        } else {
          setQuestions([])
        }
      } catch { setQuestions([]) }
      setLoadingQ(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [programKey, email])

  function setAnswer(a: Answer) {
    setAnswers(prev => ({ ...prev, [a.question_id]: a }))
  }

  function isValid() {
    return questions.every(q => {
      if (!q.required) return true
      const a = answers[q.id]
      if (!a) return false
      if (q.type === 'nps_scale') return a.text_value != null
      if (q.type === 'multiple_choice') return (a.selected_options ?? []).length > 0
      if (q.type === 'text') return (a.text_value ?? '').trim().length > 0
      return false
    })
  }

  async function handleSubmit() {
    if (!programKey.trim()) { toast.error('Informe a Program Key'); return }
    setLoading(true)

    // Monta payload
    const answerList = Object.values(answers)
    const npsAnswer = questions.find(q => q.type === 'nps_scale')
    const score = npsAnswer && answers[npsAnswer.id]?.text_value != null
      ? parseInt(answers[npsAnswer.id].text_value!, 10)
      : undefined

    const res = await fetch('/api/nps/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_key: programKey.trim(),
        user_email: email,
        score: !isNaN(score as number) ? score : undefined,
        answers: answerList.filter(a => a.question_id !== '__legacy__'),
      }),
    })
    setLoading(false)
    if (res.ok) {
      setSubmitted(true)
      toast.success('Resposta enviada com sucesso!')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Erro ao enviar')
    }
  }

  function reset() {
    setAnswers({})
    setSubmitted(false)
  }

  const npsScore = (() => {
    const npsQ = questions.find(q => q.type === 'nps_scale')
    if (!npsQ || !answers[npsQ.id]?.text_value) return null
    const v = parseInt(answers[npsQ.id].text_value!, 10)
    if (isNaN(v)) return null
    const seg = v >= 9 ? 'Promotor' : v >= 7 ? 'Neutro' : 'Detrator'
    const color = v >= 9 ? 'text-emerald-400' : v >= 7 ? 'text-yellow-400' : 'text-red-400'
    return { v, seg, color }
  })()

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Toaster richColors position="top-right" />

      <div className="w-full max-w-md space-y-5">

        {/* Aviso de página temporária */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide">Página de Teste — NPS Widget</p>
          <p className="text-yellow-400/60 text-[11px] mt-0.5">
            Abre sempre, sem recorrência. Remover quando não precisar mais.
          </p>
        </div>

        {/* Config */}
        <div className="space-y-2">
          <div>
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">
              Program Key
            </label>
            <input type="text" value={programKey} onChange={e => setProgramKey(e.target.value)}
              placeholder="Cole a program_key do programa NPS"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder:text-slate-600 outline-none focus:border-orange-500/40" />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">
              E-mail simulado
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder:text-slate-600 outline-none focus:border-orange-500/40" />
          </div>
        </div>

        {/* Widget */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-white text-sm font-bold">Obrigado pelo seu feedback!</p>
              <button onClick={reset} className="text-orange-400 text-xs font-bold uppercase tracking-wide hover:text-orange-300 transition-colors">
                Testar novamente
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pesquisa Rápida</p>
                {loadingQ && <span className="text-slate-600 text-[10px]">Carregando...</span>}
              </div>

              {questions.length === 0 && !loadingQ && (
                <p className="text-slate-600 text-xs text-center py-4">
                  {programKey.trim()
                    ? 'Nenhuma pergunta configurada neste programa.'
                    : 'Informe a program_key para carregar as perguntas.'}
                </p>
              )}

              {/* Questões dinâmicas */}
              <div className="space-y-6">
                {questions.map(q => (
                  <div key={q.id}>
                    <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                      {q.title}
                      {q.required && <span className="text-orange-400 ml-1 text-xs">*</span>}
                    </p>
                    {q.type === 'nps_scale' && <NPSScaleQuestion q={q} onChange={setAnswer} />}
                    {q.type === 'multiple_choice' && <MultipleChoiceQuestion q={q} onChange={setAnswer} />}
                    {q.type === 'text' && <TextQuestion q={q} onChange={setAnswer} />}
                  </div>
                ))}
              </div>

              {/* Actions */}
              {questions.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/5">
                  <button onClick={() => setSubmitted(true)} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
                    Não agora
                  </button>
                  <button onClick={handleSubmit} disabled={!isValid() || loading}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wide px-5 py-2 rounded-lg transition-colors">
                    {loading ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Indicador de segmento */}
        {npsScore && (
          <p className="text-center text-slate-600 text-[10px]">
            Score: <span className={`font-bold ${npsScore.color}`}>{npsScore.v}/10 — {npsScore.seg}</span>
          </p>
        )}
      </div>
    </div>
  )
}
