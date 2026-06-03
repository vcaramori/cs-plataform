'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertCircle, ExternalLink, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  status: 'connected' | 'not_connected'
  events: Office365Event[]
}

interface Props {
  userId?: string
}

export function Office365CalendarWidget({ userId }: Props) {
  const { data, isLoading, error } = useQuery<CalendarResponse>({
    queryKey: ['office365-calendar', userId || 'me'],
    queryFn: async () => {
      const url = userId ? `/api/calendar?userId=${userId}` : '/api/calendar'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar calendário')
      return res.json()
    }
  })

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

  if (data?.status === 'not_connected') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-2xl border border-accent/10 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 mb-1">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-content">Office 365 não conectado</h3>
          <p className="text-xs text-content-secondary mt-1">
            Conecte sua conta para visualizar suas reuniões do dia.
          </p>
        </div>
        <a 
          href="/api/auth/microsoft/login" 
          className="mt-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Conectar Calendário
        </a>
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
            return (
              <a 
                key={event.id}
                href={event.webLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-3 rounded-xl border border-accent/10 bg-accent/5 hover:bg-accent/10 transition-colors group"
              >
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
                  <div className="flex items-center gap-2 mt-1">
                    {event.isOnlineMeeting && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        <Video className="w-3 h-3" /> Teams
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-content-secondary/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
