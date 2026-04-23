'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SLABadge } from '@/components/support/SLABadge'
import { SLATimer } from '@/components/support/SLATimer'
import { TicketLifecycleBar } from '@/components/support/TicketLifecycleBar'
import { CSATDisplay } from '@/components/support/CSATDisplay'
import { ReplyReviewModal } from '@/components/support/ReplyReviewModal'
import type { ReplyReviewResult } from '@/app/api/support-tickets/review-reply/route'
import {
  ArrowLeft, User, Building2, Clock, Calendar,
  Lock, CheckCircle2, AlertTriangle, RefreshCw, UserCheck,
  Settings2, Send, Loader2, MessageSquare, ChevronRight,
  ExternalLink, GitBranch, Star, AlertCircle, Save,
  Mail, FileText, Hash, Shield, Zap, ChevronDown, Sparkles, ClipboardCheck
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Acesso / Login',
  'Performance / Lentidão',
  'Integração',
  'Faturamento / Pagamento',
  'Bug / Erro',
  'Dúvida / Orientação',
  'Configuração',
  'Relatório / Dados',
  'Outro',
]

const STATUSES = [
  { value: 'open',        label: 'Aberto' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'resolved',    label: 'Resolvido' },
  { value: 'closed',      label: 'Fechado' },
]

const PRIORITIES = [
  { value: 'low',      label: 'Baixo' },
  { value: 'medium',   label: 'Médio' },
  { value: 'high',     label: 'Alto' },
  { value: 'critical', label: 'Crítico' },
]

const LEVELS = [
  { value: 'low',      label: 'Baixo' },
  { value: 'medium',   label: 'Médio' },
  { value: 'high',     label: 'Alto' },
  { value: 'critical', label: 'Crítico' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string
  title: string
  description: string
  thread_content?: string | null
  status: string
  priority: string
  internal_level?: string | null
  category?: string | null
  opened_at: string
  resolved_at?: string | null
  first_response_at?: string | null
  closed_at?: string | null
  first_response_deadline?: string | null
  resolution_deadline?: string | null
  sla_status_first_response?: string | null
  sla_status_resolution?: string | null
  sla_policy_id?: string | null
  assigned_to?: string | null
  parent_ticket_id?: string | null
  external_ticket_id?: string | null
  account_id: string
  accounts: { id: string; name: string }
  external_priority_label?: string | null
}

interface Agent {
  id: string
  email: string
}

interface SLAEvent {
  id: string
  ticket_id: string
  event_type: string
  occurred_at: string
  metadata?: any
}

interface CSATResponse {
  score: number
  comment?: string | null
  answered_at: string
}

interface SupportMessage {
  id: string
  ticket_id: string
  author_id?: string | null
  author_email: string
  type: 'reply' | 'note' | 'status_change' | 'auto_event'
  body: string
  metadata?: any | null
  created_at: string
}

interface Props {
  ticket: Ticket
  events: SLAEvent[]
  messages: SupportMessage[]
  csatResponse: CSATResponse | null
  agents: Agent[]
  currentUserId: string
}

// ─── Status / Priority configs ────────────────────────────────────────────────

const statusCfg: Record<string, { label: string; color: string; dot: string }> = {
  open:        { label: 'Aberto',       color: 'text-destructive', dot: 'bg-destructive' },
  in_progress: { label: 'Em Andamento', color: 'text-accent',      dot: 'bg-accent' },
  reopened:    { label: 'Reaberto',     color: 'text-accent',      dot: 'bg-accent' },
  resolved:    { label: 'Resolvido',    color: 'text-emerald-500', dot: 'bg-emerald-500' },
  closed:      { label: 'Fechado',      color: 'text-content-secondary', dot: 'bg-border-divider' },
}

const priorityCfg: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'text-destructive' },
  high:     { label: 'Alto',    color: 'text-accent' },
  medium:   { label: 'Médio',   color: 'text-secondary' },
  low:      { label: 'Baixo',   color: 'text-content-secondary' },
}

const eventMeta: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  opened:             { icon: FileText,     label: 'Ticket criado',            color: 'text-indigo-400' },
  ticket_open:        { icon: FileText,     label: 'Ticket aberto',            color: 'text-indigo-400' },
  ticket_in_progress: { icon: Zap,          label: 'Em andamento',             color: 'text-amber-400' },
  assigned:           { icon: UserCheck,    label: 'Ticket atribuído',         color: 'text-blue-400' },
  first_response:     { icon: CheckCircle2, label: '1ª resposta registrada',   color: 'text-emerald-400' },
  ticket_resolved:    { icon: CheckCircle2, label: 'Ticket resolvido',         color: 'text-emerald-400' },
  ticket_closed:      { icon: CheckCircle2, label: 'Ticket fechado',           color: 'text-content-secondary' },
  ticket_reopened:    { icon: RefreshCw,    label: 'Ticket reaberto',          color: 'text-orange-400' },
  sla_breach:         { icon: AlertTriangle,label: 'SLA violado',              color: 'text-red-400' },
}

function fmtTs(ts: string, dateOnly = false) {
  try {
    const d = new Date(ts)
    return dateOnly
      ? format(d, "dd/MM/yyyy", { locale: ptBR })
      : format(d, "d 'de' MMM 'às' HH:mm", { locale: ptBR })
  } catch {
    return ts
  }
}

// ─── Thread components ────────────────────────────────────────────────────────

function ClientMessage({ text, ts }: { text: string; ts: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-surface-background border border-border-divider flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <User className="w-4 h-4 text-content-secondary" />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-content-primary text-xs font-semibold">Cliente</span>
          <span className="text-content-secondary text-[11px]">{fmtTs(ts)}</span>
        </div>
        <div className="bg-surface-background border border-border-divider rounded-2xl rounded-tl-sm p-4">
          <p className="text-content-primary text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  )
}

function AgentReply({ event, agents }: { event: SLAEvent; agents: Agent[] }) {
  const authorEmail = event.metadata?.author_email ?? 'Agente'
  const shortName = authorEmail.split('@')[0]
  return (
    <div className="flex gap-3 flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <Mail className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="flex-1 max-w-2xl flex flex-col items-end">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-content-secondary text-[11px]">{fmtTs(event.occurred_at)}</span>
          <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">{shortName}</span>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 dark:bg-indigo-600/10 dark:border-indigo-500/20 rounded-2xl rounded-tr-sm p-4 w-full text-right">
          <p className="text-content-primary text-sm leading-relaxed whitespace-pre-wrap text-left">{event.metadata?.body}</p>
        </div>
      </div>
    </div>
  )
}

function InternalNote({ event }: { event: SLAEvent }) {
  const authorEmail = event.metadata?.author_email ?? 'Agente'
  const shortName = authorEmail.split('@')[0]
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">{shortName}</span>
          <span className="bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-500 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Nota Interna
          </span>
          <span className="text-content-secondary text-[11px] ml-auto">{fmtTs(event.occurred_at)}</span>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/15 rounded-2xl rounded-tl-sm p-4">
          <p className="text-amber-900/80 dark:text-amber-100/80 text-sm leading-relaxed whitespace-pre-wrap">{event.metadata?.body}</p>
        </div>
      </div>
    </div>
  )
}

function LifecycleDivider({ event }: { event: SLAEvent }) {
  const meta = eventMeta[event.event_type] ?? { icon: CheckCircle2, label: event.event_type, color: 'text-content-secondary' }
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border-divider" />
      <div className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest shrink-0', meta.color)}>
        <Icon className="w-3 h-3" />
        {meta.label}
        <span className="text-content-secondary font-normal normal-case">· {fmtTs(event.occurred_at)}</span>
      </div>
      <div className="h-px flex-1 bg-border-divider" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TicketDetailClient({ ticket: init, events: initEvents, messages: initMessages, csatResponse, agents, currentUserId }: Props) {
  const router = useRouter()
  const threadRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState(init)
  const [events, setEvents] = useState(initEvents)
  const [messages, setMessages] = useState(initMessages)

  // Compose state
  const [tab, setTab] = useState<'reply' | 'note'>('reply')
  const [composeBody, setComposeBody] = useState('')
  const [closeAfter, setCloseAfter] = useState(false)
  const [sending, setSending] = useState(false)

  // Reply Outcome & AI
  const [outcome, setOutcome] = useState<'solution' | 'pending_client' | 'pending_product' | 'none'>('none')
  const [reviewApproved, setReviewApproved] = useState(false)
  const [reviewFailed, setReviewFailed] = useState(false)

  // Reply Review (Padrão Plannera)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReplyReviewResult | null>(null)

  // Inline editing
  const [editStatus, setEditStatus]     = useState(ticket.status)
  const [editPriority, setEditPriority] = useState(ticket.priority)
  const [editLevel, setEditLevel]       = useState(ticket.internal_level ?? '')
  const [editCategory, setEditCategory] = useState(ticket.category ?? '')
  const [savingProps, setSavingProps]   = useState(false)
  const [propsChanged, setPropsChanged] = useState(false)

  // Assign
  const [selectedAgent, setSelectedAgent] = useState(ticket.assigned_to ?? '')
  const [assignLoading, setAssignLoading] = useState(false)

  const hasSLA = !!(ticket.first_response_deadline || ticket.resolution_deadline || ticket.sla_policy_id)
  const sConf = statusCfg[ticket.status] ?? statusCfg.open
  const pConf = priorityCfg[ticket.priority] ?? priorityCfg.low
  const account = ticket.accounts

  const isClosedOrResolved = ['resolved', 'closed'].includes(ticket.status)
  const currentAgentEmail = agents.find(a => a.id === ticket.assigned_to)?.email

  // Scroll thread to bottom when events change
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [events])

  // Detect property changes
  useEffect(() => {
    const changed =
      editStatus !== ticket.status ||
      editPriority !== ticket.priority ||
      editLevel !== (ticket.internal_level ?? '') ||
      editCategory !== (ticket.category ?? '')
    setPropsChanged(changed)
  }, [editStatus, editPriority, editLevel, editCategory, ticket])


  async function handleSaveProps() {
    setSavingProps(true)
    try {
      const body: any = {}
      if (editStatus !== ticket.status)                   body.status = editStatus
      if (editPriority !== ticket.priority)               body.priority = editPriority
      if (editLevel !== (ticket.internal_level ?? ''))    body.internal_level = editLevel || null
      if (editCategory !== (ticket.category ?? ''))       body.category = editCategory || null

      const res = await fetch(`/api/support-tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('Propriedades atualizadas')
      router.refresh()
    } catch {
      toast.error('Erro ao salvar propriedades')
    } finally {
      setSavingProps(false)
    }
  }

  async function handleAssign() {
    if (!selectedAgent || selectedAgent === ticket.assigned_to) return
    setAssignLoading(true)
    try {
      const res = await fetch(`/api/support-tickets/${ticket.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedAgent }),
      })
      if (!res.ok) throw new Error()
      toast.success('Chamado reatribuído')
      router.refresh()
    } catch {
      toast.error('Erro ao reatribuir')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleSend() {
    if (!composeBody.trim()) return
    setSending(true)
    try {
      const endpoint = tab === 'reply' ? 'reply' : 'notes'
      const body = tab === 'reply'
        ? { body: composeBody.trim(), outcome }
        : { body: composeBody.trim() }

      console.log(`[UI Reply] Sending to ticket ${ticket.id} with outcome: ${outcome}`)
      const res = await fetch(`/api/support-tickets/${ticket.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        let errorMsg = 'Failed to send'
        try {
          const errData = await res.json()
          errorMsg = errData.error || errorMsg
        } catch {
          // If JSON parse fails (e.g. HTML 404), use status code
          if (res.status === 404) errorMsg = 'Endpoint não encontrado (404). Verifique as rotas do servidor.'
          else errorMsg = `Erro do servidor (${res.status})`
        }
        console.error('[UI Reply] Server Error:', res.status, errorMsg)
        throw new Error(errorMsg)
      }

      // Optimistic update for Messages
      const newMessage: SupportMessage = {
        id: crypto.randomUUID(),
        ticket_id: ticket.id,
        author_id: currentUserId,
        author_email: 'Você',
        type: tab === 'reply' ? 'reply' : 'note',
        body: composeBody.trim(),
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, newMessage])

      // Also optimistic update for Lifecycle Events (Legacy support)
      const newEvent: SLAEvent = {
        id: crypto.randomUUID(),
        ticket_id: ticket.id,
        event_type: tab === 'reply' ? 'agent_reply' : 'internal_note',
        occurred_at: new Date().toISOString(),
        metadata: { body: composeBody.trim(), author_email: 'Você' },
      }
      setEvents(prev => [...prev, newEvent])

      setComposeBody('')
      setOutcome('none')
      setReviewApproved(false)
      toast.success(tab === 'reply' ? 'Resposta enviada' : 'Nota salva')

      if (outcome === 'solution') router.refresh()
    } catch {
      toast.error('Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  async function handleReviewReply() {
    if (!composeBody.trim()) return
    setReviewResult(null)
    setReviewOpen(true)
    setReviewing(true)
    setReviewFailed(false)
    try {
      const currentAgent = agents.find(a => a.id === currentUserId)
      const agentName = currentAgent?.email
        ? currentAgent.email.split('@')[0].split('.').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        : 'Agente'

      const conversationHistory = messages
        .filter(m => m.type === 'reply')
        .slice(-6)
        .map(m => ({ author: m.author_email, body: m.body }))

      const res = await fetch('/api/support-tickets/review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: composeBody.trim(),
          ticketTitle: ticket.title,
          ticketDescription: ticket.description ?? '',
          clientName: ticket.accounts.name,
          agentName,
          category: ticket.category,
          conversationHistory,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[ReviewReply] API error:', res.status, errData)
        throw new Error(errData.error ?? 'Erro na API')
      }
      const data = await res.json()
      setReviewResult(data)
    } catch (err) {
      console.error('[ReviewReply] fetch error:', err)
      toast.error('Erro ao revisar resposta — verifique o console para detalhes')
      setReviewOpen(false)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="border-b border-border-divider bg-surface-card px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-content-secondary text-[11px] font-semibold uppercase tracking-widest mb-3">
          <Link href="/suporte" className="hover:text-content-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Suporte
          </Link>
          <ChevronRight className="w-3 h-3" />
          {ticket.external_ticket_id && (
            <>
              <span className="text-content-secondary font-mono">#{ticket.external_ticket_id}</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-content-primary truncate max-w-md">{ticket.title}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', sConf.color)}>
                <span className={cn('w-2 h-2 rounded-full', sConf.dot)} />
                {sConf.label}
              </span>
              <span className="text-content-secondary">·</span>

              {/* Prioridade do Contrato (Nomenclatura Flexível) */}
              <span className={cn('text-[11px] font-bold uppercase', pConf.color)}>
                {ticket.external_priority_label ?? pConf.label}
              </span>

              {ticket.internal_level && (
                <>
                  <span className="text-content-secondary">·</span>
                  <span className="text-[11px] font-bold uppercase text-content-secondary">
                    SLA: {priorityCfg[ticket.internal_level]?.label ?? ticket.internal_level}
                  </span>
                </>
              )}
              {ticket.category && (
                <>
                  <span className="text-content-secondary">·</span>
                  <span className="text-[11px] text-content-secondary">{ticket.category}</span>
                </>
              )}
            </div>

            <h1 className="h1-page !text-xl break-words leading-tight">{ticket.title}</h1>

            <div className="flex items-center gap-3 text-xs text-content-secondary">
              <Link href={`/accounts/${account.id}`} className="flex items-center gap-1.5 text-primary hover:opacity-80 transition-opacity font-bold uppercase tracking-tight">
                <Building2 className="w-3.5 h-3.5" />{account.name}<ExternalLink className="w-2.5 h-2.5" />
              </Link>
              <span>·</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Aberto: {fmtTs(ticket.opened_at + 'T12:00:00', true)}</span>
              {currentAgentEmail && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {currentAgentEmail.split('@')[0]}</span>
                </>
              )}
              {ticket.parent_ticket_id && (
                <>
                  <span>·</span>
                  <Link href={`/suporte/${ticket.parent_ticket_id}`} className="flex items-center gap-1 hover:text-content-primary transition-colors">
                    <GitBranch className="w-3 h-3" /> Ticket pai
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Lifecycle bar */}
          <TicketLifecycleBar status={ticket.status as any} className="shrink-0 hidden sm:flex" />
        </div>
      </div>

      {/* ── SLA Warning Banner ───────────────────────────────────────── */}
      {!hasSLA && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <strong>SLA não configurado</strong> — Este chamado não tem prazos monitorados. Crie uma política SLA para o contrato deste cliente.
            </p>
          </div>
          <Link
            href={`/accounts/${account.id}/sla`}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-[11px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap ml-4"
          >
            <Settings2 className="w-3 h-3" /> Configurar SLA
          </Link>
        </div>
      )}

      {/* ── Main: Thread + Sidebar ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Thread + Compose ─────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-divider w-full">

          {/* Thread (scrollable) */}
          <div ref={threadRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/20">

            {/* Original message */}
            <ClientMessage text={ticket.description} ts={ticket.opened_at + 'T12:00:00'} />

            {/* Email thread if exists */}
            {ticket.thread_content && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-background border border-border-divider flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Mail className="w-3.5 h-3.5 text-content-secondary" />
                </div>
                <div className="flex-1 max-w-2xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-content-secondary text-xs font-semibold">Thread de E-mail</span>
                  </div>
                  <div className="bg-surface-background border border-border-divider rounded-2xl rounded-tl-sm p-4 max-h-48 overflow-y-auto">
                    <p className="text-content-secondary text-xs leading-relaxed whitespace-pre-wrap font-mono">{ticket.thread_content}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Unified Messaging Thread */}
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.type === 'reply' && (
                    <AgentReply
                      event={{
                        id: msg.id,
                        occurred_at: msg.created_at,
                        event_type: 'agent_reply',
                        metadata: { body: msg.body, author_email: msg.author_email },
                        ticket_id: msg.ticket_id
                      }}
                      agents={agents}
                    />
                  )}
                  {msg.type === 'note' && (
                    <InternalNote
                      event={{
                        id: msg.id,
                        occurred_at: msg.created_at,
                        event_type: 'internal_note',
                        metadata: { body: msg.body, author_email: msg.author_email },
                        ticket_id: msg.ticket_id
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Lifecycle Divider Events (that are not replies/notes) */}
            <AnimatePresence initial={false}>
              {events.filter(e => e.event_type !== 'agent_reply' && e.event_type !== 'internal_note').map(event => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LifecycleDivider event={event} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* CSAT at bottom of thread */}
            {isClosedOrResolved && (
              <div className="border-t border-border-divider pt-5">
                <div className="flex items-center gap-2 mb-3 text-content-secondary text-[10px] font-bold uppercase tracking-widest">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> Avaliação CSAT
                </div>
                <CSATDisplay response={csatResponse} />
              </div>
            )}
          </div>

          {/* Compose area ─────────────────────────────────────────── */}
          <div className="border-t border-border-divider bg-surface-card p-4 shrink-0 shadow-lg">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3 bg-slate-100 dark:bg-accent/10 p-1 rounded-xl border border-border-divider w-fit">
              <button
                onClick={() => setTab('reply')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all',
                  tab === 'reply'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-content-secondary hover:text-content-primary'
                )}
              >
                <Mail className="w-3 h-3" /> Responder ao Cliente
              </button>
              <button
                onClick={() => setTab('note')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all',
                  tab === 'note'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 shadow border border-amber-200 dark:border-amber-500/30'
                    : 'text-content-secondary hover:text-content-primary'
                )}
              >
                <Lock className="w-3 h-3" /> Nota Interna
              </button>
            </div>

            {/* Context indicator */}
            {tab === 'note' && (
              <p className="text-amber-500/70 text-[10px] mb-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Visível apenas para a equipe interna — não será enviado ao cliente
              </p>
            )}
            {tab === 'reply' && (
              <p className="text-indigo-400/70 text-[10px] mb-2 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Resposta registrada no histórico do chamado
              </p>
            )}

            <Textarea
              value={composeBody}
              onChange={e => { setComposeBody(e.target.value); if (reviewApproved) setReviewApproved(false) }}
              placeholder={
                tab === 'reply'
                  ? 'Escreva a resposta ao cliente...'
                  : 'Adicione uma nota interna para a equipe...'
              }
              rows={4}
              className={cn(
                'bg-surface-card text-content-primary placeholder:text-content-secondary text-sm rounded-xl resize-none border transition-colors',
                tab === 'reply' ? 'border-indigo-200 focus:border-indigo-400 dark:border-indigo-500/20 dark:focus:border-indigo-500/40' : 'border-amber-200 focus:border-amber-400 dark:border-amber-500/10 dark:focus:border-amber-500/30'
              )}
            />

            <div className="flex items-center justify-between mt-3">
              {/* Outcome Selector — only when review is approved */}
              {tab === 'reply' ? (
                reviewApproved ? (
                  <Select value={outcome} onValueChange={(v: any) => setOutcome(v)}>
                    <SelectTrigger className="w-[190px] h-9 bg-surface-background border-border-divider text-content-primary text-[11px] font-bold uppercase tracking-widest">
                      <SelectValue placeholder="Status do chamado..." />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      <SelectItem value="none"            className="text-[11px] font-bold uppercase">Manter Aberto</SelectItem>
                      <SelectItem value="solution"        className="text-[11px] font-bold uppercase text-emerald-500">Resolver Chamado</SelectItem>
                      <SelectItem value="pending_client"  className="text-[11px] font-bold uppercase text-amber-500">Aguardar Cliente</SelectItem>
                      <SelectItem value="pending_product" className="text-[11px] font-bold uppercase text-indigo-500">Aguardar Produto</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[10px] text-content-secondary italic">Avalie a resposta para continuar</span>
                )
              ) : <div />}

              {/* Send buttons */}
              <div className="flex items-center gap-2">
                {tab === 'reply' && reviewApproved && (
                  <Button
                    onClick={() => { setReviewApproved(false); handleReviewReply() }}
                    disabled={reviewing || !composeBody.trim()}
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase tracking-widest text-[10px] gap-1.5 border-border-divider text-content-secondary hover:text-content-primary hover:border-border-divider"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Reavaliar
                  </Button>
                )}
                <Button
                  onClick={tab === 'reply' && !reviewApproved ? handleReviewReply : handleSend}
                  disabled={(reviewing || sending) || !composeBody.trim()}
                  size="sm"
                  className={cn(
                    'font-bold uppercase tracking-widest text-[10px] gap-1.5',
                    tab === 'reply'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20'
                  )}
                >
                  {(reviewing || sending)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                  {tab === 'reply'
                    ? (reviewApproved
                        ? (outcome === 'solution' ? 'Enviar e Resolver' : 'Enviar Resposta')
                        : 'Avaliar e Enviar')
                    : 'Salvar Nota'
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar ──────────────────────────────────────────── */}
        <div className="w-80 shrink-0 overflow-y-auto bg-surface-card border-l border-border-divider">

          {/* ─ SLA ───────────────────────────────────────────── */}
          <section className="border-b border-border-divider p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em]">SLA</p>
                {!hasSLA && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              </div>
              <Link href={`/accounts/${account.id}/sla`} className="flex items-center gap-1 text-[10px] text-content-secondary hover:text-indigo-400 transition-colors font-semibold uppercase tracking-widest">
                <Settings2 className="w-3 h-3" /> Config
              </Link>
            </div>

            {!hasSLA ? null : (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-content-secondary font-bold uppercase tracking-widest mb-1">1ª Resposta</p>
                  <div className="flex items-center gap-2">
                    <SLABadge status={ticket.sla_status_first_response as any} />
                    <SLATimer deadline={ticket.first_response_deadline ?? null} resolvedAt={ticket.first_response_at} />
                  </div>
                  {ticket.first_response_deadline && (
                    <p className="text-[10px] text-content-secondary font-mono mt-1">
                      Limite: {format(new Date(ticket.first_response_deadline), 'dd/MM HH:mm')}
                    </p>
                  )}
                </div>
                <div className="h-px bg-border-divider" />
                <div>
                  <p className="text-[10px] text-content-secondary font-bold uppercase tracking-widest mb-1">Resolução</p>
                  <div className="flex items-center gap-2">
                    <SLABadge status={ticket.sla_status_resolution as any} />
                    <SLATimer deadline={ticket.resolution_deadline ?? null} resolvedAt={ticket.resolved_at} />
                  </div>
                  {ticket.resolution_deadline && (
                    <p className="text-[10px] text-content-secondary font-mono mt-1">
                      Limite: {format(new Date(ticket.resolution_deadline), 'dd/MM HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ─ Classificação (inline editable) ──────────────── */}
          <section className="border-b border-border-divider p-4 space-y-3">
            <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em]">Classificação</p>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-content-secondary font-bold uppercase tracking-widest block mb-1">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-full bg-surface-card border-border-divider text-content-primary text-xs h-9 shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-divider text-content-primary">
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] text-content-secondary font-bold uppercase tracking-widest block mb-1">Prioridade</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="w-full bg-surface-card border-border-divider text-content-primary text-xs h-9 shadow-sm">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-divider text-content-primary">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] text-content-secondary font-bold uppercase tracking-widest block mb-1">Nível Interno (SLA)</label>
                <Select value={editLevel} onValueChange={setEditLevel}>
                  <SelectTrigger className="w-full bg-surface-card border-border-divider text-content-primary text-xs h-9 shadow-sm">
                    <SelectValue placeholder="Nível Interno" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-divider text-content-primary">
                    <SelectItem value="none" className="text-xs opacity-50 italic">— Não definido —</SelectItem>
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] text-content-secondary font-bold uppercase tracking-widest block mb-1">Categoria / Tópico</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="w-full bg-surface-card border-border-divider text-content-primary text-xs h-9 shadow-sm">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-divider text-content-primary">
                    <SelectItem value="none" className="text-xs opacity-50 italic">— Sem categoria —</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AnimatePresence>
                {propsChanged && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Button
                      onClick={handleSaveProps}
                      disabled={savingProps}
                      size="sm"
                      className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 font-bold uppercase tracking-widest text-[10px] gap-1.5"
                    >
                      {savingProps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar Alterações
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ─ Responsável ───────────────────────────────────── */}
          <section className="border-b border-border-divider p-4 space-y-3">
            <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em]">Responsável</p>

            <div className="flex items-center gap-2.5 p-2.5 bg-surface-background rounded-lg border border-border-divider">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <p className="text-content-primary text-xs font-semibold">{currentAgentEmail?.split('@')[0] ?? 'Não atribuído'}</p>
                <p className="text-content-secondary text-[10px]">{currentAgentEmail ?? '—'}</p>
              </div>
            </div>

            {agents.length > 0 && (
              <div className="space-y-2">
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-full bg-surface-card border-border-divider text-content-primary text-xs h-9 shadow-sm">
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border-border-divider text-content-primary">
                    <SelectItem value="none" className="text-xs opacity-50">Selecionar agente...</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={assignLoading || !selectedAgent || selectedAgent === ticket.assigned_to}
                  size="sm"
                  className="w-full bg-surface-background hover:bg-surface-card text-content-primary border border-border-divider font-bold uppercase tracking-widest text-[10px] gap-1.5"
                >
                  {assignLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Reatribuir
                </Button>
              </div>
            )}
          </section>

          {/* ─ Info do Cliente ───────────────────────────────── */}
          <section className="border-b border-border-divider p-4 space-y-3">
            <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em]">Cliente</p>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <p className="text-content-primary text-xs font-semibold">{account.name}</p>
                <Link
                  href={`/accounts/${account.id}`}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px] font-medium transition-colors mt-0.5"
                >
                  Ver conta <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* ─ Datas / Timeline ─────────────────────────────── */}
          <section className="p-4 space-y-2.5">
            <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em] mb-3">Histórico</p>
            {[
              { label: 'Aberto em',      value: ticket.opened_at ? fmtTs(ticket.opened_at + 'T12:00:00') : null, color: 'text-content-primary' },
              { label: '1ª Resposta',    value: ticket.first_response_at ? fmtTs(ticket.first_response_at) : null, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Resolvido em',   value: ticket.resolved_at ? fmtTs(ticket.resolved_at) : null, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Fechado em',     value: ticket.closed_at ? fmtTs(ticket.closed_at) : null, color: 'text-content-secondary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <span className="text-[10px] text-content-secondary font-bold uppercase tracking-widest shrink-0">{label}</span>
                <span className={cn('text-[11px] font-mono text-right', value ? color : 'text-content-secondary opacity-40')}>
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </section>

        </div>
      </div>

      <ReplyReviewModal
        open={reviewOpen}
        originalText={composeBody}
        review={reviewResult}
        onSelectOriginal={() => {
          if (reviewResult?.suggested_outcome) setOutcome(reviewResult.suggested_outcome as any)
          setReviewApproved(true)
          setReviewOpen(false)
        }}
        onSelectRecommended={() => {
          if (reviewResult) {
            setComposeBody(reviewResult.recommended_version)
            setOutcome(reviewResult.suggested_outcome as any)
          }
          setReviewApproved(true)
          setReviewOpen(false)
        }}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  )
}
