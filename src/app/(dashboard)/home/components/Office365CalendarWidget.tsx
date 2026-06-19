'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, AlertCircle, ExternalLink, Video, Link2, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface Office365Event {
  id: string
  subject: string
  start: string
  end: string
  webLink: string
  isOnlineMeeting: boolean
  isAllDay: boolean
}

interface CalendarResponse {
  status: 'connected' | 'not_connected' | 'error'
  source?: 'microsoft' | 'ics'
  events: Office365Event[]
  error?: string
}

interface Props {
  userId?: string
}

export function Office365CalendarWidget({ userId }: Props) {
  const queryClient = useQueryClient()
  const isOwn = !userId
  const [icsUrl, setIcsUrl] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useQuery<CalendarResponse>({
    queryKey: ['office365-calendar', userId || 'me'],
    queryFn: async () => {
      const url = userId ? `/api/calendar?userId=${userId}` : '/api/calendar'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar calendário')
      return res.json()
    }
  })

  async function saveIcs() {
    if (!icsUrl.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/calendar/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: icsUrl.trim() }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Falha ao salvar')
      toast.success('Calendário conectado! Sua agenda vai aparecer aqui.')
      setIcsUrl(''); setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['office365-calendar'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function removeIcs() {
    setSaving(true)
    try {
      await fetch('/api/calendar/ics', { method: 'DELETE' })
      toast.success('Calendário desconectado')
      queryClient.invalidateQueries({ queryKey: ['office365-calendar'] })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 bg-accent/20 rounded w-1/3" />
        <div className="h-16 bg-accent/20 rounded-xl" />
        <div className="h-16 bg-accent/20 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-xl border border-destructive/20">
        <AlertCircle className="w-4 h-4" />
        <p>Não foi possível carregar a agenda.</p>
      </div>
    )
  }

  // Formulário de conexão por link ICS (caminho sem Azure/admin).
  const IcsForm = (
    <div className="flex flex-col gap-2 w-full">
      <input
        type="url"
        value={icsUrl}
        onChange={(e) => setIcsUrl(e.target.value)}
        placeholder="Cole o link .ics publicado do seu Outlook"
        className="w-full text-xs border border-accent/20 rounded-lg bg-background px-3 py-2 outline-none focus:border-primary/50 font-mono"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={saveIcs}
          disabled={saving || !icsUrl.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Conectar
        </button>
        <a
          href="https://support.microsoft.com/pt-br/office/compartilhar-seu-calend%C3%A1rio-no-outlook-na-web-7ecef8ae-139c-40d9-bae2-a23977ee58d5"
          target="_blank" rel="noreferrer"
          className="text-[11px] text-content-secondary underline hover:text-primary"
        >
          Como publicar o calendário no Outlook?
        </a>
      </div>
    </div>
  )

  if (data?.status === 'not_connected') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-2xl border border-accent/10 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 mb-1">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-content">Calendário não conectado</h3>
          <p className="text-xs text-content-secondary mt-1">
            {isOwn ? 'Cole o link do seu calendário Outlook (.ics) para ver suas reuniões do dia.' : 'Este usuário ainda não conectou o calendário.'}
          </p>
        </div>
        {isOwn && (
          <>
            {IcsForm}
            <div className="text-[10px] text-content-secondary/70">
              ou <a href="/api/auth/microsoft/login" className="underline hover:text-primary">conectar via Microsoft 365</a> (requer app configurado pelo TI)
            </div>
          </>
        )}
      </div>
    )
  }

  if (data?.status === 'error') {
    return (
      <div className="flex flex-col gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4" /> {data.error || 'Falha ao ler o calendário.'}
        </div>
        {isOwn && IcsForm}
      </div>
    )
  }

  const events = data?.events || []

  return (
    <div className="flex flex-col gap-3">
      {events.length === 0 ? (
        <div className="p-4 text-center border border-dashed border-accent/20 rounded-xl">
          <p className="text-sm text-content-secondary">Nenhuma reunião agendada para hoje.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const startDate = parseISO(event.start)
            const endDate = parseISO(event.end)
            const inner = (
              <>
                <div className="flex flex-col items-center justify-center min-w-[50px] text-xs font-medium text-content-secondary">
                  {event.isAllDay ? (
                    <span>O dia todo</span>
                  ) : (
                    <>
                      <span>{format(startDate, 'HH:mm')}</span>
                      <span className="text-[10px] opacity-70">{format(endDate, 'HH:mm')}</span>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content truncate group-hover:text-primary transition-colors">
                    {event.subject}
                  </p>
                  {event.isOnlineMeeting && (
                    <span className="mt-1 flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">
                      <Video className="w-3 h-3" /> Online
                    </span>
                  )}
                </div>
                {event.webLink && (
                  <div className="text-content-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                )}
              </>
            )
            const cls = "flex items-center gap-4 p-3 rounded-xl border border-accent/10 bg-accent/5 hover:bg-accent/10 transition-colors group"
            return event.webLink ? (
              <a key={event.id} href={event.webLink} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
            ) : (
              <div key={event.id} className={cls}>{inner}</div>
            )
          })}
        </div>
      )}

      {/* Gestão do feed ICS (só no próprio calendário) */}
      {isOwn && data?.source === 'ics' && (
        <div className="flex items-center justify-end gap-3 pt-1">
          {showForm ? (
            <div className="w-full">{IcsForm}</div>
          ) : (
            <>
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 text-[11px] text-content-secondary hover:text-primary">
                <RefreshCw className="w-3 h-3" /> Trocar link
              </button>
              <button onClick={removeIcs} disabled={saving} className="inline-flex items-center gap-1 text-[11px] text-content-secondary hover:text-destructive">
                <Trash2 className="w-3 h-3" /> Desconectar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
