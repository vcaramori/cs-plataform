'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Loader2, Sparkles, MessageSquare, ListChecks, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MeetingPrep {
  last_meeting_notes: string
  next_meeting_date: string | null
  suggested_topics: string[]
  ai_talking_points: string[]
}

interface Props {
  accountId: string
  accountName: string
}

export function MeetingPrepModal({ accountId, accountName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MeetingPrep | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadMeetingPrep() {
    if (data) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/meeting-prep`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao gerar pauta')
      } else {
        setData(json)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (val) loadMeetingPrep()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button 
          className="flex items-center text-left gap-3 px-4 py-3 rounded-2xl border border-border-divider/50 bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-lg transition-all duration-300 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:scale-[1.02] active:scale-95 shrink-0"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-primary/10 flex items-center justify-center border border-indigo-500/20 dark:border-primary/20 text-indigo-600 dark:text-primary">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-50 select-none text-content-secondary">Pauta Reunião</span>
            <span className="text-sm font-black tracking-tight text-indigo-600 dark:text-primary uppercase leading-tight">
              Meeting Prep
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-xl bg-surface-card border-border-divider">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-content-primary">
            <Sparkles className="w-5 h-5 text-plannera-orange" />
            Meeting Prep — {accountName}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[200px] flex flex-col gap-5 py-2">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-content-secondary"
              >
                <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
                <p className="text-sm">Gerando pauta com IA…</p>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}

            {data && !loading && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5"
              >
                {data.next_meeting_date ? (
                  <div className="flex items-center gap-2 text-sm text-content-secondary">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      Próxima reunião:{' '}
                      <span className="font-semibold text-content-primary">
                        {new Date(data.next_meeting_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline" className="self-start text-content-secondary border-border-divider">
                    Nenhuma reunião agendada
                  </Badge>
                )}

                {data.last_meeting_notes && data.last_meeting_notes !== 'No previous meeting notes' && (
                  <div className="p-3 rounded-xl bg-surface-background border border-border-divider">
                    <p className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-1">
                      Última reunião
                    </p>
                    <p className="text-sm text-content-primary leading-relaxed">{data.last_meeting_notes}</p>
                  </div>
                )}

                {data.suggested_topics.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ListChecks className="w-4 h-4 text-plannera-orange" />
                      <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                        Tópicos sugeridos
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {data.suggested_topics.map((topic, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-content-primary">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-plannera-orange shrink-0" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.ai_talking_points.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                        Pontos-chave (IA)
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {data.ai_talking_points.map((point, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-background border border-border-divider text-sm text-content-primary"
                        >
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          {point}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {!data.next_meeting_date && data.ai_talking_points.length === 0 && (
                  <p className="text-sm text-content-secondary text-center py-4">
                    Agende uma reunião para gerar a pauta com IA.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {data && (
          <div className="flex justify-end pt-2 border-t border-border-divider">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
              onClick={() => { setData(null); loadMeetingPrep() }}
            >
              <Sparkles className="w-3 h-3" />
              Regenerar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
