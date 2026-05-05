'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, User, Building2, Tag, AlertCircle, MessageSquare, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SupportTicket, SupportTicketMessage } from '@/lib/supabase/types'
import { PreviewActionBar } from './PreviewActionBar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SLABadge } from '@/components/support/SLABadge'
import { useTicketPresence } from '@/lib/hooks/useTicketPresence'
import { UrgencyBadge } from './UrgencyBadge'
import { AlertTriangle, Tag, X, Calendar, User, Building2, MessageSquare, History, Loader2, Users } from 'lucide-react'

interface TicketPreviewPanelProps {
  ticketId: string | null
  onClose: () => void
  onTicketUpdated?: (ticket: SupportTicket) => void
}

export const TicketPreviewPanel: React.FC<TicketPreviewPanelProps> = ({
  ticketId,
  onClose,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<(SupportTicket & { accounts?: { name: string } | null }) | null>(null)
  const [messages, setMessages] = useState<SupportTicketMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string, email: string } | null>(null)
  const supabase = getSupabaseBrowserClient()

  const otherViewers = useTicketPresence(ticketId, currentUser?.id || null, currentUser?.email || null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser({ id: user.id, email: user.email || '' })
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (ticketId) {
      fetchTicketData(ticketId)
    } else {
      setTicket(null)
      setMessages([])
    }
  }, [ticketId])

  const fetchTicketData = async (id: string) => {
    setLoading(true)
    try {
      // Fetch ticket with account info
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*, accounts(name)')
        .eq('id', id)
        .single()

      if (ticketError) throw ticketError

      // Fetch messages
      const { data: messageData, error: messageError } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true })

      if (messageError) throw messageError

      setTicket(ticketData as any)
      setMessages(messageData || [])
    } catch (err: any) {
      console.error('Error fetching ticket details:', err)
      toast.error('Erro ao carregar detalhes do ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId || isUpdating) return

    setIsUpdating(true)
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update status')

      const updatedTicket = await res.json()
      setTicket(prev => prev ? { ...prev, ...updatedTicket } : null)
      onTicketUpdated?.(updatedTicket)
      toast.success(`Ticket ${newStatus === 'resolved' ? 'resolvido' : 'atualizado'} com sucesso`)
    } catch (err) {
      toast.error('Erro ao atualizar status do ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignMe = async () => {
    if (!ticketId || isUpdating) return

    setIsUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const res = await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: user.id })
      })

      if (!res.ok) throw new Error('Failed to assign ticket')

      const updatedTicket = await res.json()
      setTicket(prev => prev ? { ...prev, ...updatedTicket } : null)
      onTicketUpdated?.(updatedTicket)
      toast.success('Ticket atribuído a você')
    } catch (err) {
      toast.error('Erro ao atribuir ticket')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
    open: { label: 'Aberto', color: 'text-destructive', bg: 'bg-destructive/10' },
    'in_progress': { label: 'Em Progresso', color: 'text-accent', bg: 'bg-accent/10' },
    resolved: { label: 'Resolvido', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    closed: { label: 'Fechado', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
    reopened: { label: 'Reaberto', color: 'text-accent', bg: 'bg-accent/10' },
  }

  const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
    critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
    high: { label: 'Alto', color: 'text-accent', bg: 'bg-accent/10' },
    medium: { label: 'Médio', color: 'text-secondary', bg: 'bg-secondary/10' },
    low: { label: 'Baixo', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
  }

  return (
    <AnimatePresence>
      {ticketId && (
        <>
          {/* Overlay to close when clicking outside */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[40]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-surface-background border-l border-surface-border shadow-2xl z-[50] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-surface-background border-b border-surface-border">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Tag className="w-3 h-3" />
                  <span>#{ticket?.external_ticket_id || ticketId.slice(0, 8)}</span>
                  <Separator orientation="vertical" className="h-3 mx-1" />
                  <span className={cn("px-2 py-0.5 rounded-full font-bold", statusConfig[ticket?.status || 'open']?.bg, statusConfig[ticket?.status || 'open']?.color)}>
                    {statusConfig[ticket?.status || 'open']?.label}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-content-primary leading-tight mt-1">
                  {loading ? 'Carregando...' : ticket?.title}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                <p>Buscando detalhes do ticket...</p>
              </div>
            ) : ticket ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Collision Warning */}
                {otherViewers.length > 0 && (
                  <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-3">
                    <Users className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Colisão: {otherViewers.map(v => v.email.split('@')[0]).join(', ')} também visualizando
                    </span>
                  </div>
                )}

                {/* Quick Actions Sticky Bar */}
                <PreviewActionBar 
                  ticketId={ticket.id}
                  status={ticket.status}
                  onStatusChange={handleStatusChange}
                  onAssignMe={handleAssignMe}
                  isUpdating={isUpdating}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-background border border-surface-border">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Conta</span>
                        <span className="text-sm font-medium">{ticket.accounts?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-background border border-surface-border">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Prioridade</span>
                        <span className={cn("text-sm font-bold", priorityConfig[ticket.priority]?.color)}>
                          {priorityConfig[ticket.priority]?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-background border border-surface-border">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Aberto em</span>
                        <span className="text-sm font-medium">
                          {ticket.opened_at ? format(new Date(ticket.opened_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-background border border-surface-border">
                      <History className="w-5 h-5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">SLA Resolução</span>
                        <div className="flex items-center gap-1">
                          <SLABadge 
                            status={ticket.sla_status_resolution} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Urgency AI Analysis (F1-07) */}
                  {ticket.urgency_score && (
                    <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 shadow-inner space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-plannera-primary shadow-[0_0_8px_var(--primary)]" />
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Insights do Guardião IA</span>
                        </div>
                        <UrgencyBadge score={ticket.urgency_score} />
                      </div>
                      <p className="text-xs text-slate-300 italic leading-relaxed font-medium">
                        "{typeof ticket.urgency_reasoning === 'object' ? ticket.urgency_reasoning?.text : ticket.urgency_reasoning}"
                      </p>
                    </div>
                  )}

                  {/* Description Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b border-surface-border pb-2">
                      <MessageSquare className="w-4 h-4" />
                      Descrição do Ticket
                    </div>
                    <div className="text-sm text-content-secondary leading-relaxed bg-surface-background border border-surface-border p-4 rounded-2xl whitespace-pre-wrap">
                      {ticket.description || 'Nenhuma descrição fornecida.'}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground border-b border-surface-border pb-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Histórico e Mensagens
                      </div>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                        {messages.length} mensagens
                      </Badge>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-surface-border">
                      {messages.length > 0 ? (
                        messages.map((msg) => (
                          <div key={msg.id} className="relative pl-12">
                            <div className="absolute left-0 top-1 z-10">
                              <Avatar className="h-10 w-10 border-2 border-surface-background shadow-sm">
                                <AvatarFallback className="bg-accent text-white text-xs">
                                  {msg.author_email?.slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="bg-surface-background border border-surface-border p-4 rounded-2xl shadow-sm space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-content-primary">
                                  {msg.author_email || 'Sistema'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(msg.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <div className="text-sm text-content-secondary whitespace-pre-wrap">
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma interação registrada.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer / Reply quick area (optional, maybe next iteration) */}
                <div className="p-4 bg-surface-background border-t border-surface-border flex justify-end">
                   <Link href={`/suporte/${ticket.id}`} passHref>
                    <Button variant="default" className="rounded-xl shadow-lg shadow-accent/20">
                      Abrir Detalhes e Responder
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p>Ticket não encontrado.</p>
                <Button variant="outline" onClick={onClose}>Fechar Painel</Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
