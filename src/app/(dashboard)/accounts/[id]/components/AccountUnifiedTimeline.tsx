'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import {
  Users,
  Terminal,
  Mail,
  Clock,
  FileText,
  Sparkles,
  Eye,
  Ticket as TicketIcon,
  Star,
  DollarSign,
  Heart,
  Search
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { NPSDetailModal } from './NPSDetailModal'
import { PlaybookHistoryModal } from './PlaybookHistoryModal'
import { InteractionDetailModal } from './InteractionDetailModal'
import { ContractDetailModal } from './ContractDetailModal'
import { HealthEventDetailModal } from './HealthEventDetailModal'

interface Props {
  interactions: any[]
  efforts: any[]
  tickets: any[]
  npsResponses: any[]
  playbooks: any[]
  contracts?: any[]
  healthScores?: any[]
  accounts: any[]
  accountName?: string
}

export function AccountUnifiedTimeline({ interactions, efforts, tickets, npsResponses, playbooks, contracts = [], healthScores = [], accounts, accountName }: Props) {
  const [filter, setFilter] = useState<'all' | 'strategic' | 'atendimento'>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEffort, setSelectedEffort] = useState<any>(null)
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null)
  const [selectedNPS, setSelectedNPS] = useState<any>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [selectedHealthEvent, setSelectedHealthEvent] = useState<any>(null)
  const router = useRouter()

  const itemsPerPage = 15

  // Reset page quando filter muda (F2-01-D)
  useEffect(() => {
    setPage(1)
  }, [filter])

  // Função helper: determinar o tipo de evento de contrato
  const determineContractEventType = (contract: any): string => {
    if (!contract) return 'created'

    // Se renewal_date é "hoje" ou "ontem"
    if (contract.renewal_date) {
      const renewalDate = new Date(contract.renewal_date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (renewalDate.toDateString() === today.toDateString() || renewalDate.toDateString() === yesterday.toDateString()) {
        return 'renewal'
      }
    }

    // Se status indica mudança recente (at-risk, in-negotiation)
    if (contract.status === 'at-risk' || contract.status === 'in-negotiation') {
      return 'status_change'
    }

    // Padrão: criado
    return 'created'
  }

  // Função helper: determinar a cor do status de health
  const getHealthStatusColor = (status?: string): string => {
    switch (status) {
      case 'healthy':
        return 'emerald-500'
      case 'at_risk':
        return 'amber-500'
      case 'critical':
        return 'red-500'
      default:
        return 'gray-400'
    }
  }

  // F2-01-F: Cleanup de eventos deletados
  const combined = [
    // Interactions: filter deleted_at e is_archived
    ...interactions
      .filter(i => !i.deleted_at && !i.is_archived)
      .map(i => ({
        ...i,
        itemType: i.type === 'playbook' ? 'playbook' : 'interaction',
        date: i.date || i.created_at,
        isStrategic: i.type !== 'playbook'
      })),
    // Efforts: filter deleted_at e is_archived
    ...efforts
      .filter(e => !e.deleted_at && !e.is_archived)
      .map(e => ({ ...e, itemType: 'effort', date: e.date, isStrategic: false })),
    // Tickets: filter deleted_at
    ...tickets
      .filter(t => !t.deleted_at)
      .map(t => ({ ...t, itemType: 'ticket', date: t.opened_at, isStrategic: false })),
    // NPS Responses: filter deleted_at
    ...npsResponses
      .filter(n => !n.deleted_at)
      .map(n => ({ ...n, itemType: 'nps', date: n.responded_at || n.created_at, isStrategic: false })),
    // Contracts: filter deleted_at (churned é OK)
    ...contracts
      .filter(c => !c.deleted_at)
      .map(c => ({
        ...c,
        itemType: 'contract_event',
        date: c.renewal_date || c.created_at,
        event_type: determineContractEventType(c),
        isStrategic: true,
        title: `Contrato: ${c.description || c.service_type || 'N/A'}`,
        description: c.status
      })),
    // Health Scores: filter deleted_at e evaluated_at
    ...healthScores
      .filter(hs => !hs.deleted_at && hs.evaluated_at)
      .map(hs => ({
        ...hs,
        itemType: 'health_event',
        date: hs.evaluated_at,
        isStrategic: true,
        title: `Health Score: ${hs.manual_score || hs.shadow_score || 'N/A'}`,
        description: `${hs.manual_score ?? '—'} manual, ${hs.shadow_score ?? '—'} IA`,
        health_score: hs.manual_score || hs.shadow_score,
        manual_score: hs.manual_score,
        shadow_score: hs.shadow_score,
        health_status: hs.manual_score
          ? (hs.manual_score > 75 ? 'healthy' : hs.manual_score >= 50 ? 'at_risk' : 'critical')
          : (hs.shadow_score > 75 ? 'healthy' : hs.shadow_score >= 50 ? 'at_risk' : 'critical')
      }))
  ]

  // F2-01-E: Função de busca client-side
  const searchMatches = (item: any) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const fields = [
      item.title,
      item.description,
      item.raw_transcript,
      item.parsed_description,
      item.comment
    ]
    return fields.some(field => field?.toLowerCase().includes(query))
  }

  // Pipeline: filter -> search -> sort
  const filtered = combined.filter(item => {
    if (filter === 'strategic') return item.isStrategic
    if (filter === 'atendimento') return (item.itemType === 'ticket' || item.itemType === 'nps') && item.itemType !== 'contract_event' && item.itemType !== 'health_event'
    return true
  })

  const searched = filtered.filter(searchMatches)

  // F2-01-C: Sort Toggle
  const sorted = [...searched].sort((a, b) => {
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })

  // F2-01-D: Pagination
  const start = (page - 1) * itemsPerPage
  const end = start + itemsPerPage
  const paginatedItems = sorted.slice(start, end)
  const totalPages = Math.ceil(sorted.length / itemsPerPage)

  const getIcon = (item: any) => {
    if (item.itemType === 'health_event') {
      if (item.health_status === 'healthy') return <Heart className="w-3.5 h-3.5 text-emerald-500" />
      if (item.health_status === 'at_risk') return <Heart className="w-3.5 h-3.5 text-amber-500" />
      if (item.health_status === 'critical') return <Heart className="w-3.5 h-3.5 text-red-500" />
      return <Heart className="w-3.5 h-3.5 text-gray-400" />
    }
    if (item.itemType === 'contract_event') return <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
    if (item.itemType === 'ticket') return <TicketIcon className="w-3.5 h-3.5 text-plannera-demand" />
    if (item.itemType === 'nps') return <Star className="w-3.5 h-3.5 text-amber-500" />
    if (item.itemType === 'playbook') return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
    if (item.isStrategic) return <Users className="w-3.5 h-3.5 text-plannera-orange" />
    if (item.activity_type === 'email') return <Mail className="w-3.5 h-3.5 text-plannera-sop" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-3.5 h-3.5 text-plannera-ds" />
    return <FileText className="w-3.5 h-3.5 text-content-secondary" />
  }

  const handleItemClick = (item: any) => {
    switch (item.itemType) {
      case 'effort':
        setSelectedEffort(item)
        break
      case 'ticket':
        router.push(`/suporte/${item.id}`)
        break
      case 'nps':
        setSelectedNPS({ ...item, account_name: accountName || accounts[0]?.name || 'Conta Cliente' })
        break
      case 'playbook':
        // Tentar encontrar o objeto completo do playbook nos playbooks da conta
        const fullPlaybook = playbooks.find(p =>
          p.id === item.id ||
          (item.metadata && p.id === item.metadata.playbook_id) ||
          p.template?.name === item.title
        )
        setSelectedPlaybook(fullPlaybook || item)
        break
      case 'interaction':
        setSelectedInteraction(item)
        break
      case 'contract_event':
        setSelectedContract(item)
        break
      case 'health_event':
        setSelectedHealthEvent(item)
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header: Tabs + Sort Toggle + Counter */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-background p-1 rounded-xl border border-border-divider">
            {[
              { id: 'all', label: 'Feed Geral' },
              { id: 'strategic', label: 'Estratégia' },
              { id: 'atendimento', label: 'Atendimento & NPS' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                  filter === tab.id ? "bg-plannera-sop text-white shadow-lg" : "text-content-secondary hover:text-content-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* F2-01-C: Sort Toggle Button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-content-secondary hover:text-content-primary hover:bg-surface-background border border-border-divider transition-colors"
          >
            {sortOrder === 'desc' ? '🔽 Mais recente' : '🔼 Mais antigo'}
          </button>
        </div>
        <span className="text-[9px] text-content-secondary font-bold uppercase tracking-widest">{sorted.length} Atividades</span>
      </div>

      {/* F2-01-E: Search Input */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-content-secondary" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-background border border-border-divider text-[10px] text-content-primary placeholder-content-secondary focus:outline-none focus:ring-1 focus:ring-plannera-sop"
          />
        </div>
      </div>

      <div className="relative space-y-4 px-4">
        <div className="absolute left-8 top-4 bottom-4 w-px bg-border-divider" />

        <AnimatePresence mode="popLayout">
          {paginatedItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative flex items-start gap-3 group"
            >
              <div className={cn(
                "mt-1.5 flex items-center justify-center w-8 h-8 rounded-xl border bg-surface-background z-10 transition-all duration-300 shadow-lg flex-shrink-0 group-hover:scale-105",
                item.itemType === 'health_event' ? "border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                item.itemType === 'contract_event' ? "border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]" :
                item.isStrategic ? "border-plannera-orange/30 shadow-[0_0_12px_rgba(247,148,30,0.15)]" :
                item.itemType === 'playbook' ? "border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]" :
                item.itemType === 'ticket' ? "border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                item.itemType === 'nps' ? "border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]" :
                "border-border-divider"
              )}>
                {getIcon(item)}
              </div>

              <Card
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex-1 min-w-0 transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-muted/30 hover:scale-[1.01] active:scale-[0.99]",
                  item.itemType === 'health_event' && "ring-1 ring-red-500/20 bg-red-500/[0.02]",
                  item.itemType === 'contract_event' && "ring-1 ring-indigo-500/20 bg-indigo-500/[0.02]",
                  item.isStrategic && item.itemType !== 'contract_event' && item.itemType !== 'health_event' && "ring-1 ring-plannera-orange/20",
                  item.itemType === 'playbook' && "ring-1 ring-emerald-500/20 bg-emerald-500/[0.02]",
                  item.itemType === 'ticket' && "ring-1 ring-red-500/10",
                  item.itemType === 'nps' && "ring-1 ring-amber-500/10"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-content-primary text-xs font-bold tracking-tight truncate">
                        {item.itemType === 'health_event' ? item.title :
                         item.itemType === 'ticket' ? `Ticket: ${item.title}` :
                         item.itemType === 'nps' ? `Avaliação NPS: ${item.score}/10` :
                         item.itemType === 'contract_event' ? item.title :
                         item.title || item.parsed_description}
                      </span>
                      {item.priority === 'critical' && (
                        <Badge className="bg-red-500/10 text-red-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                          Crítico
                        </Badge>
                      )}
                      {item.itemType === 'health_event' && item.health_status === 'critical' && (
                        <Badge className="bg-red-500/10 text-red-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                          Crítico
                        </Badge>
                      )}
                      {item.itemType === 'health_event' && item.health_status === 'at_risk' && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                          Em Risco
                        </Badge>
                      )}
                    </div>
                    <span className="text-content-secondary text-[9px] font-bold font-mono tracking-tighter shrink-0 mt-0.5">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-content-secondary text-[11px] leading-relaxed line-clamp-2 italic">
                    {item.itemType === 'health_event' ? item.description :
                     item.raw_transcript || item.parsed_description || item.description || item.comment || "Nenhum comentário registrado."}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {item.itemType === 'ticket' ? (
                        <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest bg-muted/30 border-none">
                          Status: {item.status}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-background border border-border-divider text-[9px] text-content-secondary font-bold uppercase tracking-tight">
                          <Clock className="w-2.5 h-2.5 text-plannera-sop" />
                          {item.direct_hours || item.parsed_hours || 0}h
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-plannera-sop font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.itemType === 'ticket' ? 'Abrir Chamado' :
                         item.itemType === 'effort' ? 'Editar Registro' :
                         item.itemType === 'contract_event' ? 'Ver Contrato' :
                         item.itemType === 'health_event' ? 'Ver Health Score' :
                         'Ver Detalhes'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* F2-01-D: Pagination Footer */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-divider">
          <span className="text-[9px] text-content-secondary font-bold">
            {start + 1} a {Math.min(end, sorted.length)} de {sorted.length} atividades
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded text-[10px] font-bold text-content-secondary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-[9px] text-content-secondary font-bold">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded text-[10px] font-bold text-content-secondary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      <EffortEditModal
        entry={selectedEffort}
        onClose={() => setSelectedEffort(null)}
        onUpdate={() => {
          setSelectedEffort(null)
          router.refresh()
        }}
        accounts={accounts}
      />

      <NPSDetailModal
        render={selectedNPS}
        onOpenChange={(open) => !open && setSelectedNPS(null)}
      />

      <PlaybookHistoryModal
        playbook={selectedPlaybook}
        onOpenChange={(open) => !open && setSelectedPlaybook(null)}
      />

      <InteractionDetailModal
        interaction={selectedInteraction}
        onClose={() => setSelectedInteraction(null)}
        onUpdate={() => {
          setSelectedInteraction(null)
          router.refresh()
        }}
        accountName={accountName || accounts[0]?.name}
      />

      <ContractDetailModal
        contract={selectedContract}
        onOpenChange={(open) => !open && setSelectedContract(null)}
      />

      <HealthEventDetailModal
        healthEvent={selectedHealthEvent}
        onOpenChange={(open) => !open && setSelectedHealthEvent(null)}
      />
    </div>
  )
}
