'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { NPSDetailModal } from './NPSDetailModal'
import { ModalSkeleton } from '@/components/LazyLoader'

const PlaybookHistoryModal = lazy(() => import('./PlaybookHistoryModal').then(m => ({ default: m.PlaybookHistoryModal })))
import { InteractionDetailModal } from './InteractionDetailModal'
import { ContractDetailModal } from './ContractDetailModal'
import { HealthEventDetailModal } from './HealthEventDetailModal'
import { TimelineFilter } from './TimelineFilter'
import { TimelineEvent } from './TimelineEvent'

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

export function AccountUnifiedTimeline({
  interactions,
  efforts,
  tickets,
  npsResponses,
  playbooks,
  contracts = [],
  healthScores = [],
  accounts,
  accountName
}: Props) {
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

  const itemsPerPage = 5

  useEffect(() => {
    setPage(1)
  }, [filter])

  // Helper: determinar tipo de evento de contrato
  const determineContractEventType = (contract: any): string => {
    if (!contract) return 'created'

    if (contract.renewal_date) {
      const renewalDate = new Date(contract.renewal_date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (renewalDate.toDateString() === today.toDateString() || renewalDate.toDateString() === yesterday.toDateString()) {
        return 'renewal'
      }
    }

    if (contract.status === 'at-risk' || contract.status === 'in-negotiation') {
      return 'status_change'
    }

    return 'created'
  }

  // Combinar todos os eventos e normalizar
  const combined = [
    ...interactions
      .filter(i => !i.deleted_at && !i.is_archived)
      .map(i => ({
        ...i,
        itemType: i.type === 'playbook' ? 'playbook' : 'interaction',
        date: i.date || i.created_at,
        isStrategic: i.type !== 'playbook'
      })),
    ...efforts
      .filter(e => !e.deleted_at && !e.is_archived)
      .map(e => ({ ...e, itemType: 'effort', date: e.date, isStrategic: false })),
    ...tickets
      .filter(t => !t.deleted_at)
      .map(t => ({ ...t, itemType: 'ticket', date: t.opened_at, isStrategic: false })),
    ...npsResponses
      .filter(n => !n.deleted_at)
      .map(n => ({ ...n, itemType: 'nps', date: n.responded_at || n.created_at, isStrategic: false })),
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

  // Search
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

  const sorted = [...searched].sort((a, b) => {
    const timeA = new Date(a.date).getTime()
    const timeB = new Date(b.date).getTime()
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })

  // Pagination
  const start = (page - 1) * itemsPerPage
  const end = start + itemsPerPage
  const paginatedItems = sorted.slice(start, end)
  const totalPages = Math.ceil(sorted.length / itemsPerPage)

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
      case 'playbook': {
        const fullPlaybook = playbooks.find(p =>
          p.id === item.id ||
          (item.metadata && p.id === item.metadata.playbook_id) ||
          p.template?.name === item.title
        )
        setSelectedPlaybook(fullPlaybook || item)
        break
      }
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
      <TimelineFilter
        filter={filter}
        setFilter={setFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalActivities={sorted.length}
      />

      <div className="relative space-y-4 px-4">
        <div className="absolute left-8 top-4 bottom-4 w-px bg-border-divider" />

        <AnimatePresence mode="popLayout">
          {paginatedItems.map((item, idx) => (
            <TimelineEvent
              key={item.id}
              item={item}
              idx={idx}
              onItemClick={handleItemClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination Footer */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-2 py-3 border-t border-border-divider text-[10px] font-bold text-content-secondary">
          <span className="whitespace-nowrap opacity-80">
            {start + 1}-{Math.min(end, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-1.5 py-0.5 rounded hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              ← Ant
            </button>
            <span className="opacity-40">|</span>
            <span className="whitespace-nowrap">
              {page}/{totalPages}
            </span>
            <span className="opacity-40">|</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-1.5 py-0.5 rounded hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              Prox →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
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

      <Suspense fallback={<ModalSkeleton />}>
        <PlaybookHistoryModal
          playbook={selectedPlaybook}
          onOpenChange={(open) => !open && setSelectedPlaybook(null)}
        />
      </Suspense>

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
