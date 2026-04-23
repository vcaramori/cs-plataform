'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageContainer } from '@/components/ui/page-container'
import { Text } from '@/components/ui/typography'
import { SLABadge } from '@/components/support/SLABadge'
import { SLATimer } from '@/components/support/SLATimer'
import { TicketLifecycleBar } from '@/components/support/TicketLifecycleBar'
import { CSATDisplay } from '@/components/support/CSATDisplay'
import { ReplyReviewModal } from '@/components/support/ReplyReviewModal'
import type { ReplyReviewResult } from '@/app/api/support-tickets/review-reply/route'
import {
  ArrowLeft, User, Building2, Calendar,
  Lock, CheckCircle2, AlertTriangle, RefreshCw, UserCheck,
  Settings2, Send, Loader2, ChevronRight,
  ExternalLink, GitBranch, Star, Save,
  Mail, FileText, Zap, ClipboardCheck, Paperclip, Image as ImageIcon
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  pending_reason: 'client' | 'product' | 'none' | null
  sla_breach_first_response: boolean
  sla_breach_resolution: boolean
  sla_status_first_response: 'no_prazo'|'atencao'|'vencido'|'cumprido'|'violado' | null
  sla_status_resolution: 'no_prazo'|'atencao'|'vencido'|'cumprido'|'violado' | null
  sla_policy_id?: string | null
  first_response_deadline?: string | null
  resolution_deadline?: string | null
  assigned_to?: string | null
  parent_ticket_id?: string | null
  external_ticket_id?: string | null
  account_id: string
  accounts: { id: string; name: string }
  external_priority_label?: string | null
}

interface SupportIndicators {
  etaStatus: 'no_prazo' | 'atrasado' | 'nenhum'
  brokenEta: boolean
  harmonicMean: number | null
  latencyMinutes: number | null
  pillars: {
    tom: number
    estrutura: number
    empatia: number
    clareza: number
    alinhamento: number
  } | null
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
  opened:             { icon: FileText,     label: 'Ticket criado',            color: 'text-indigo-600' },
  ticket_open:        { icon: FileText,     label: 'Ticket aberto',            color: 'text-indigo-600' },
  ticket_in_progress: { icon: Zap,          label: 'Em andamento',             color: 'text-amber-600' },
  assigned:           { icon: UserCheck,    label: 'Ticket atribuído',         color: 'text-blue-600' },
  first_response:     { icon: CheckCircle2, label: '1ª resposta registrada',   color: 'text-emerald-600' },
  ticket_resolved:    { icon: CheckCircle2, label: 'Ticket resolvido',         color: 'text-emerald-600' },
  ticket_closed:      { icon: CheckCircle2, label: 'Ticket fechado',           color: 'text-content-secondary' },
  ticket_reopened:    { icon: RefreshCw,    label: 'Ticket reaberto',          color: 'text-orange-600' },
  sla_breach:         { icon: AlertTriangle,label: 'SLA violado',              color: 'text-red-600' },
}


const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB - System limit
const EMAIL_ATTACHMENT_LIMIT = 20 * 1024 * 1024 // 20MB - Email limit

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

const markdownComponents = {
  p: ({ children }: any) => <p className="leading-relaxed mb-3 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc ml-4 mb-3 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal ml-4 mb-3 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  code: ({ children }: any) => <code className="bg-black/10 dark:bg-white/10 px-1 rounded font-mono text-[0.9em]">{children}</code>,
  img: ({ src, alt }: any) => (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block my-3">
      <img 
        src={src} 
        alt={alt} 
        className="rounded-lg border border-black/10 dark:border-white/10 max-w-full h-auto hover:opacity-90 transition-opacity" 
        loading="lazy"
      />
    </a>
  ),
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
          <div className="text-content-primary text-sm">
            <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
          </div>
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
      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
        <Mail className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 max-w-2xl flex flex-col items-end">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-content-secondary text-[11px]">{fmtTs(event.occurred_at)}</span>
          <span className="text-xs font-bold uppercase tracking-tight text-indigo-500 dark:text-indigo-400">{shortName}</span>
        </div>
        <div className="bg-indigo-600 border border-indigo-500 rounded-2xl rounded-tr-sm p-4 w-full shadow-premium">
          <div className="text-white text-sm prose-invert">
            <ReactMarkdown components={markdownComponents}>{event.metadata?.body}</ReactMarkdown>
          </div>
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
      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Lock className="w-3.5 h-3.5 text-amber-600" />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-amber-700 text-xs font-semibold">{shortName}</span>
          <span className="bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Nota Interna
          </span>
          <Text variant="secondary" className="text-[11px] ml-auto">{fmtTs(event.occurred_at)}</Text>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-2xl rounded-tl-sm p-4">
          <div className="text-amber-950 dark:text-amber-200 text-sm">
            <ReactMarkdown components={markdownComponents}>{event.metadata?.body}</ReactMarkdown>
          </div>
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const [ticket] = useState(init)
  const [events, setEvents] = useState(initEvents)
  const [messages, setMessages] = useState(initMessages)
  const isInitialMount = useRef(true)

  // Compose state
  const [tab, setTab] = useState<'reply' | 'note'>('reply')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)

  // Reply Outcome & AI
  const [outcome, setOutcome] = useState<'solution' | 'pending_client' | 'pending_product' | 'none'>('none')
  const [reviewApproved, setReviewApproved] = useState(false)
  const [reviewFailed, setReviewFailed] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  // Reply Review (Padrão Plannera)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReplyReviewResult | null>(null)
  const [indicatorsOpen, setIndicatorsOpen] = useState(false)
  const [indicators, setIndicators] = useState<SupportIndicators | null>(null)

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (messages.length > 0) {
      calculateIndicators()
    }
  }, [messages])

  const calculateIndicators = () => {
    // 1. Média Harmônica e Pilares
    const repliesWithEval = messages
      .filter(m => m.type === 'reply' && m.metadata?.evaluation)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    let pillars = null
    let hMean = null

    if (repliesWithEval.length > 0) {
      const evalData = repliesWithEval[0].metadata.evaluation
      pillars = {
        tom: evalData.tone || evalData.tom || 0,
        estrutura: evalData.structure || evalData.estrutura || 0,
        empatia: evalData.empathy || evalData.empatia || 0,
        clareza: evalData.clarity || evalData.clareza || 0,
        alinhamento: evalData.alignment || evalData.alinhamento || 0
      }
      
      const scores = [pillars.tom, pillars.estrutura, pillars.empatia, pillars.clareza, pillars.alinhamento]
      if (scores.every(s => s > 0)) {
        const sumInv = scores.reduce((acc, s) => acc + (1 / s), 0)
        hMean = Math.round((scores.length / sumInv) * 10) / 10
      } else {
        hMean = 0
      }
    }

    // 2. ETA e Broken ETA
    let etaStatus: 'no_prazo' | 'atrasado' | 'nenhum' = 'nenhum'
    let brokenEta = false
    
    const agentMessages = messages.filter(m => m.type === 'reply' || m.type === 'note')
    
    for (const msg of agentMessages) {
      const text = msg.body.toLowerCase()
      const etaMatch = text.match(/(volto|retorno|respondo|até|compromisso|prazo)\s*(em|às|as)?\s*(\d{1,2})(:|h|min)/i)
      
      if (etaMatch) {
        const msgDate = new Date(msg.created_at)
        const now = new Date()
        const diffHours = (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60)
        
        if (diffHours > 2 && ticket.status !== 'resolved' && ticket.status !== 'closed') {
          etaStatus = 'atrasado'
          brokenEta = true
          if (pillars) pillars.alinhamento = Math.max(0, pillars.alinhamento - 40) // Penalidade forte
        } else {
          etaStatus = 'no_prazo'
        }
      }
    }

    // 3. Latência Média (Fictício para demonstrador, usaria getBusinessMinutesBetween)
    let totalLatency = 0
    let interactionCount = 0
    
    for (let i = 1; i < messages.length; i++) {
      const current = messages[i]
      const prev = messages[i-1]
      
      if (prev.author_email !== ticket.accounts.name && current.type === 'reply') {
        const start = new Date(prev.created_at)
        const end = new Date(current.created_at)
        const diff = (end.getTime() - start.getTime()) / (1000 * 60)
        totalLatency += diff
        interactionCount++
      }
    }

    setIndicators({
      etaStatus,
      brokenEta,
      harmonicMean: hMean,
      latencyMinutes: interactionCount > 0 ? Math.round(totalLatency / interactionCount) : null,
      pillars
    })
  }

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
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: isInitialMount.current ? 'auto' : 'smooth' 
      })
      isInitialMount.current = false
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

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Arquivo muito pesado. O limite máximo do sistema é 500MB.`)
      return
    }

    const isLarge = file.size > EMAIL_ATTACHMENT_LIMIT
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      // Organização em pastas para política de expiração diferenciada
      const folder = isLarge ? 'temporary' : 'permanent'
      const filePath = `${folder}/${ticket.id}/${fileName}`

      const res = await fetch(`/api/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'ticket-attachments',
          path: filePath,
          fileType: file.type,
          fileName: file.name
        })
      })

      if (!res.ok) throw new Error('Falha ao obter URL de upload')
      const { uploadUrl, publicUrl } = await res.json()

      // Upload direto para o S3/Supabase Storage via URL assinada ou Proxy
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      if (!uploadRes.ok) throw new Error('Erro no upload do arquivo')

      const isImage = file.type.startsWith('image/')
      const suffix = isLarge ? ' *(Expira em 7 dias)*' : ''
      const markdown = isImage 
        ? `\n![${file.name}](${publicUrl})${suffix}\n`
        : `\n[📎 Anexo: ${file.name}](${publicUrl})${suffix}\n`
      
      setComposeBody(prev => prev + markdown)
      toast.success('Arquivo anexado')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) uploadFile(file)
      }
    }
  }

  const handleFileClick = () => fileInputRef.current?.click()

  return (
    <PageContainer noPadding className="flex flex-col h-full min-h-0">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border-divider bg-surface-card px-6 py-4">
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

            <Text as="h1" variant="primary" className="text-xl font-black uppercase tracking-tight break-words leading-tight">{ticket.title}</Text>

            <div className="flex items-center gap-3">
              <Link href={`/accounts/${account.id}`} className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-400 transition-colors font-bold uppercase tracking-tight text-xs">
                <Building2 className="w-3.5 h-3.5" />{account.name}<ExternalLink className="w-2.5 h-2.5" />
              </Link>
              <Text variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">·</Text>
              <Text variant="secondary" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                <Calendar className="w-3 h-3" /> Aberto: {fmtTs(ticket.opened_at + 'T12:00:00', true)}
              </Text>
              {currentAgentEmail && (
                <>
                  <Text variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">·</Text>
                  <Text variant="secondary" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                    <UserCheck className="w-3 h-3" /> {currentAgentEmail.split('@')[0]}
                  </Text>
                </>
              )}
              {ticket.parent_ticket_id && (
                <>
                  <Text variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">·</Text>
                  <Link href={`/suporte/${ticket.parent_ticket_id}`} className="flex items-center gap-1 text-content-secondary hover:text-content-primary transition-colors text-[10px] font-bold uppercase tracking-widest">
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


      {/* ── Main: Thread + Sidebar ───────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Thread + Compose ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 xl:border-r border-border-divider flex flex-col min-h-0 relative">

          {/* Thread (scrollable) */}
          <div ref={threadRef} className="flex-1 p-6 space-y-5 bg-surface-background overflow-y-auto custom-scrollbar">

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
            <div ref={bottomRef} />
          </div>

          {/* Compose area ─────────────────────────────────────────── */}
          <div className="sticky bottom-0 z-10 border-t border-border-divider bg-surface-card p-4 shadow-lg">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3 bg-surface-background p-1 rounded-xl border border-border-divider w-fit">
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
                    ? 'bg-amber-100 text-amber-700 shadow border border-amber-200'
                    : 'text-content-secondary hover:text-content-primary'
                )}
              >
                <Lock className="w-3 h-3" /> Nota Interna
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadFile(file)
              }}
            />

            <div className="relative group">
              <Textarea
                value={composeBody}
                onChange={e => { setComposeBody(e.target.value); if (reviewApproved) setReviewApproved(false) }}
                onPaste={handlePaste}
                placeholder={
                  tab === 'reply'
                    ? 'Escreva a resposta ao cliente...'
                    : 'Adicione uma nota interna para a equipe...'
                }
                className={cn(
                  'min-h-[140px] pb-12 bg-surface-card text-content-primary placeholder:text-content-secondary text-sm rounded-xl resize-none border transition-colors focus-visible:ring-1 focus-visible:ring-indigo-500/30',
                  tab === 'reply' ? 'border-indigo-200' : 'border-amber-200'
                )}
                disabled={sending || uploading}
              />

              {/* Attachment Actions */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={handleFileClick}
                        disabled={sending || uploading}
                      >
                        <Paperclip className="w-4 h-4 text-content-secondary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Anexar Arquivo (Máx 20MB)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={handleFileClick}
                        disabled={sending || uploading}
                      >
                        <ImageIcon className="w-4 h-4 text-content-secondary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Inserir Imagem (ou Cole)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {uploading && (
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500 animate-pulse bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Loader2 className="w-3 h-3 animate-spin" /> Subindo arquivo...
                  </div>
                )}
              </div>

              {/* Expire Notice */}
              <div className="absolute bottom-3 right-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary/40">
                  Expira em 7 dias (se {'>'} 20MB)
                </span>
              </div>
            </div>

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
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200'
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
        <div className="w-full xl:w-72 xl:shrink-0 bg-surface-card border-t xl:border-t-0 xl:border-l border-border-divider overflow-y-auto custom-scrollbar">

          {/* ─ SLA ───────────────────────────────────────────── */}
          <section className="border-b border-border-divider p-4 space-y-3">
            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Text variant="secondary" className="text-[10px] font-black uppercase tracking-[0.2em]">SLA</Text>
                      {!hasSLA && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                    </div>
                  </TooltipTrigger>
                  {!hasSLA && (
                    <TooltipContent side="left" className="max-w-[240px] text-xs p-3 leading-relaxed">
                      Este chamado não tem prazos monitorados. Crie uma política SLA para o contrato deste cliente.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Link href={`/accounts/${account.id}/sla`} className="flex items-center gap-1 text-[10px] text-content-secondary hover:text-indigo-600 transition-colors font-semibold uppercase tracking-widest">
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
            <Text variant="secondary" className="text-[10px] font-black uppercase tracking-[0.2em]">Classificação</Text>

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
                <label className="text-[10px] text-content-secondary font-black uppercase tracking-widest block mb-1">Prioridade / SLA</label>
                <Select value={editPriority} onValueChange={(v) => { setEditPriority(v); setEditLevel(v); }}>
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
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-widest text-[10px] gap-1.5"
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
            <Text variant="secondary" className="text-[10px] font-black uppercase tracking-[0.2em]">Responsável</Text>

            <div className="flex items-center gap-2.5 p-2.5 bg-surface-background rounded-lg border border-border-divider">
              <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
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

                <Button
                  variant="outline"
                  onClick={() => setIndicatorsOpen(true)}
                  className="w-full justify-start gap-2 text-content-primary border-border-divider hover:bg-surface-background font-bold uppercase tracking-widest text-[10px]"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Ver Indicadores 360°
                </Button>
              </div>
            )}
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

      <IndicatorsModal
        open={indicatorsOpen}
        onClose={() => setIndicatorsOpen(false)}
        indicators={indicators}
      />
    </PageContainer>
  )
}

// ─── Indicators Modal ─────────────────────────────────────────────────────────

function IndicatorsModal({ open, onClose, indicators }: { 
  open: boolean, 
  onClose: () => void, 
  indicators: SupportIndicators | null 
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-surface-card border border-border-divider rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-divider flex items-center justify-between bg-surface-background">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <Text as="h3" size="xl" weight="bold" className="text-content-primary">Indicadores 360°</Text>
              <Text size="sm" variant="secondary">Performance e Qualidade em Tempo Real</Text>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Qualidade */}
          <div className="space-y-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">Métricas de Qualidade</Text>
            
            <div className="bg-surface-background p-4 rounded-lg border border-border-divider">
              <div className="flex items-end justify-between mb-2">
                <Text size="sm" variant="secondary">Média Harmônica</Text>
                <Text className="text-3xl font-black text-indigo-500">{indicators?.harmonicMean || 'N/A'}</Text>
              </div>
              <div className="h-2 bg-border-divider rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${(indicators?.harmonicMean || 0) * 10}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'Tom de Voz', value: indicators?.pillars?.tom },
                { label: 'Estrutura', value: indicators?.pillars?.estrutura },
                { label: 'Empatia', value: indicators?.pillars?.empatia },
                { label: 'Clareza', value: indicators?.pillars?.clareza },
                { label: 'Alinhamento', value: indicators?.pillars?.alinhamento },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between text-xs p-2 hover:bg-surface-background rounded transition-colors">
                  <Text className="text-content-secondary">{p.label}</Text>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-border-divider rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-400/50" 
                        style={{ width: `${(p.value || 0) * 10}%` }}
                      />
                    </div>
                    <Text className="font-mono font-bold w-4">{p.value || '-'}</Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Operacional */}
          <div className="space-y-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">Métricas Operacionais</Text>
            
            <div className="bg-surface-background p-4 rounded-lg border border-border-divider">
              <Text size="sm" variant="secondary" className="mb-1">Status do ETA</Text>
              <div className="flex items-center gap-2">
                {indicators?.etaStatus === 'no_prazo' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <Text className="font-bold text-emerald-500">Compromisso Mantido</Text>
                  </>
                ) : indicators?.etaStatus === 'atrasado' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <Text className="font-bold text-rose-500">Compromisso Quebrado</Text>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 text-content-secondary opacity-30" />
                    <Text className="text-content-secondary italic">Sem ETA detectado</Text>
                  </>
                )}
              </div>
            </div>

            <div className="bg-surface-background p-4 rounded-lg border border-border-divider">
              <Text size="sm" variant="secondary" className="mb-1">Latência (Horário Útil)</Text>
              <div className="flex items-baseline gap-1">
                <Text className="text-2xl font-black text-content-primary">
                  {indicators?.latencyMinutes ? indicators.latencyMinutes : '--'}
                </Text>
                <Text size="sm" variant="secondary" className="font-bold">min</Text>
              </div>
              <Text className="text-[10px] text-content-secondary mt-1 italic">
                * Calculado apenas entre 09:00 e 18:00
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <Text className="text-xs font-bold text-amber-900 leading-tight">Insight da IA</Text>
                  <Text className="text-[11px] text-amber-800/80 leading-relaxed">
                    {indicators?.brokenEta 
                      ? "A quebra de compromisso de horário impactou severamente o score de Alinhamento. Priorize o fechamento deste ciclo para mitigar o atrito."
                      : "O atendimento mantém consistência tonal elevada. Recomenda-se manter a estrutura de tópicos adotada na última interação."}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-background border-t border-border-divider flex justify-end">
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            Entendido
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
