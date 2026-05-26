'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, User, Building2, Tag, AlertCircle, MessageSquare, History, Loader2, Users, Merge, AlertTriangle } from 'lucide-react'
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
import { MergeTicketModal } from './MergeTicketModal'
import { cn } from '@/lib/utils'
import { SLABadge } from '@/components/support/SLABadge'
import { UrgencyBadge } from './UrgencyBadge'

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
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // TODO: Implement collision detection via Supabase Presence
  const otherViewers: string[] = []

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
      const res = await fetch(`/api/support-tickets/${id}`)
      if (!res.ok) throw new Error('Failed to fetch ticket')

      const { ticket, messages } = await res.json()
      setTicket(ticket)
      setMessages(messages || [])
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
    resolved: { label: 'Resolvido', color: 'text-success', bg: 'bg-success/10' },
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
          {/* Overlay to close when clicking outside - z-[150] covers floating page actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[150]"
          />

          {/* Drawer Panel - z-[200] is top-level. max-w-xl (512px) makes it elegant and complement the view */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-screen max-h-screen w-full max-w-lg bg-surface-background border-l border-border-divider/60 shadow-2xl z-[200] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-surface-card border-b border-border-divider/50">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  <Tag className="w-3 h-3 text-content-secondary/60" />
                  <span>#{ticket?.external_ticket_id || ticketId.slice(0, 8)}</span>
                  <Separator orientation="vertical" className="h-3 mx-1 bg-border-divider" />
                  <span className={cn("px-2 py-0.5 rounded-full font-bold", statusConfig[ticket?.status || 'open']?.bg, statusConfig[ticket?.status || 'open']?.color)}>
                    {statusConfig[ticket?.status || 'open']?.label}
                  </span>
                </div>
                <h2 className="text-[13px] font-black uppercase tracking-wider text-content-primary leading-snug mt-1.5 max-w-[400px] truncate">
                  {loading ? 'Carregando...' : ticket?.title}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-surface-background">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Buscando detalhes do chamado...</p>
              </div>
            ) : ticket ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Collision Warning */}
                {otherViewers.length > 0 && (
                  <div className="bg-warning/10 border-b border-warning-500/20 px-4 py-1.5 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-warning animate-pulse" />
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                      Colisão: {otherViewers.join(', ')} também visualizando
                    </span>
                  </div>
                )}

                {/* Quick Actions Sticky Bar */}
                <PreviewActionBar 
                  ticketId={ticket.id}
                  status={ticket.status}
                  onStatusChange={handleStatusChange}
                  onAssignMe={handleAssignMe}
                  onMerge={() => setIsMergeModalOpen(true)}
                  isUpdating={isUpdating}
                />

                {/* Scrollable Container with custom sleek scrollbar styling */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-divider/30 [&::-webkit-scrollbar-track]:bg-transparent">
                  
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-card/45 border border-border-divider/50 shadow-sm">
                      <Building2 className="w-4 h-4 text-content-secondary/60" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-content-secondary/70 uppercase font-black tracking-wider">Conta</span>
                        <span className="text-xs font-bold text-content-primary truncate max-w-[180px]">{ticket.accounts?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-card/45 border border-border-divider/50 shadow-sm">
                      <AlertCircle className="w-4 h-4 text-content-secondary/60" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-content-secondary/70 uppercase font-black tracking-wider">Prioridade</span>
                        <span className={cn("text-xs font-black uppercase tracking-wider", priorityConfig[ticket.priority]?.color)}>
                          {priorityConfig[ticket.priority]?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-card/45 border border-border-divider/50 shadow-sm">
                      <Calendar className="w-4 h-4 text-content-secondary/60" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-content-secondary/70 uppercase font-black tracking-wider">Aberto em</span>
                        <span className="text-xs font-bold text-content-primary">
                          {ticket.opened_at ? format(new Date(ticket.opened_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-card/45 border border-border-divider/50 shadow-sm">
                      <History className="w-4 h-4 text-content-secondary/60" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-content-secondary/70 uppercase font-black tracking-wider">SLA Resolução</span>
                        <div className="flex items-center mt-0.5">
                          <SLABadge 
                            status={ticket.sla_status_resolution} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Urgency AI Analysis (F1-07) */}
                  {ticket.urgency_score !== null && ticket.urgency_score !== undefined && (
                    <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/80 shadow-inner space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-plannera-primary shadow-[0_0_8px_var(--primary)]" />
                          <span className="text-[9px] text-content-secondary uppercase font-black tracking-[0.25em]">Insights do Guardião IA</span>
                        </div>
                        <UrgencyBadge score={ticket.urgency_score} />
                      </div>
                      <p className="text-[11px] text-slate-300 italic leading-relaxed font-semibold">
                        "{typeof ticket.urgency_reasoning === 'object' ? ticket.urgency_reasoning?.text : ticket.urgency_reasoning}"
                      </p>
                    </div>
                  )}

                  {/* Description Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-content-secondary border-b border-border-divider/40 pb-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-content-secondary/60" />
                      Descrição do Ticket
                    </div>
                    <div className="text-xs text-content-secondary leading-relaxed bg-surface-card/20 border border-border-divider/40 p-3.5 rounded-xl whitespace-pre-wrap font-medium">
                      {ticket.description || 'Nenhuma descrição fornecida.'}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-content-secondary border-b border-border-divider/40 pb-1.5">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-content-secondary/60" />
                        Histórico e Mensagens
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0 h-4 bg-surface-card border-border-divider">
                        {messages.length} mensagens
                      </Badge>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-border-divider/50">
                      {messages.length > 0 ? (
                        messages.map((msg) => (
                          <div key={msg.id} className="relative pl-10">
                            <div className="absolute left-0 top-1.5 z-10">
                              <Avatar className="h-8 w-8 border border-border-divider shadow-sm bg-surface-card">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold uppercase">
                                  {msg.author_email?.slice(0, 2).toUpperCase() || 'SYS'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="bg-surface-card/30 border border-border-divider/40 p-3 rounded-xl shadow-sm space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-content-primary truncate max-w-[180px]">
                                  {msg.author_email || 'Sistema'}
                                </span>
                                <span className="text-[9px] font-semibold text-content-secondary/60 whitespace-nowrap">
                                  {format(new Date(msg.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <div className="text-xs text-content-secondary whitespace-pre-wrap font-medium">
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-content-secondary/40">
                          Nenhuma interação registrada.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer with dynamic padding for safety space in the bottom of screen */}
                <div className="p-4 pb-6 bg-surface-card border-t border-border-divider/50 flex justify-end flex-shrink-0 shadow-lg z-10">
                  <Link href={`/suporte/${ticket.id}`} passHref>
                    <Button variant="default" className="rounded-xl shadow-lg bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-5 gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Abrir Detalhes e Responder
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Ticket não encontrado.</p>
                <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Fechar Painel</Button>
              </div>
            )}
          </motion.div>

          {ticket && (
            <MergeTicketModal 
              isOpen={isMergeModalOpen}
              onClose={() => setIsMergeModalOpen(false)}
              secondaryTicket={{
                id: ticket.id,
                title: ticket.title,
                account_id: ticket.account_id
              }}
              onSuccess={() => fetchTicketData(ticket.id)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
