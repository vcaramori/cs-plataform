'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Account, SupportTicket } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BulkActionBar } from './BulkActionBar'
import { BulkActionModal } from './BulkActionModal'
import { FilterEditorModal } from './FilterEditorModal'
import { TicketPreviewPanel } from './TicketPreviewPanel'
import { usePreviewPanel } from '@/lib/hooks/usePreviewPanel'
import { SuporteKPIs } from './SuporteKPIs'
import { SuporteFilters } from './SuporteFilters'
import { SuporteTable } from './SuporteTable'
import { SupportBulkImport } from './SupportBulkImport'

function sortTickets(tickets: any[]) {
  const priorityMap: any = { critical: 0, high: 1, medium: 2, low: 3 }
  const slaMap: any = { vencido: 0, atencao: 1, no_prazo: 2 }

  return [...tickets].sort((a, b) => {
    const slaA = slaMap[a.sla_status_resolution] ?? 99
    const slaB = slaMap[b.sla_status_resolution] ?? 99
    if (slaA !== slaB) return slaA - slaB

    const pA = priorityMap[a.priority] ?? 99
    const pB = priorityMap[b.priority] ?? 99
    if (pA !== pB) return pA - pB

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function SuporteClient({
  accounts,
  initialTickets,
  userId,
}: {
  accounts: Pick<Account, 'id' | 'name'>[]
  initialTickets: (SupportTicket & { accounts?: Pick<Account, 'id' | 'name'> | null })[]
  userId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list')
  const [tickets, setTickets] = useState<(SupportTicket & { accounts?: Pick<Account, 'id' | 'name'> | null })[]>(initialTickets)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateViewPopover, setShowCreateViewPopover] = useState(false)
  const [showFilterEditor, setShowFilterEditor] = useState(false)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [semanticResults, setSemanticResults] = useState<{ ids: Set<string>; scores: Map<string, number> } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [undoSnapshot, setUndoSnapshot] = useState<any[] | null>(null)
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<'change_status' | 'assign' | 'close' | null>(null)
  const [csms, setCSMs] = useState<Array<{ id: string; name: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { previewId, openPreview, closePreview } = usePreviewPanel()

  // Fetch CSMs on mount
  useEffect(() => {
    const fetchCSMs = async () => {
      try {
        const res = await fetch('/api/accounts')
        if (res.ok) {
          const data = await res.json()
          const csmList = data
            .filter((account: any) => account.csm_owner?.id && account.csm_owner?.name)
            .map((account: any) => ({ id: account.csm_owner.id, name: account.csm_owner.name }))
            .filter((item: any, index: number, self: any[]) => self.findIndex(x => x.id === item.id) === index)
          setCSMs(csmList)
        }
      } catch (err) {
        console.error('Failed to fetch CSMs:', err)
      }
    }
    fetchCSMs()
  }, [])

  // Semantic search with debounce
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSemanticResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoadingSearch(true)
      try {
        const res = await fetch('/api/support-tickets/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        })
        if (res.ok) {
          const data = await res.json()
          const ids = new Set<string>((data.tickets ?? []).map((t: any) => t.id))
          const scores = new Map<string, number>((data.tickets ?? []).map((t: any) => [t.id, t.similarity]))
          setSemanticResults({ ids, scores })
        }
      } catch (err) {
        console.warn('[Semantic Search] Fallback to in-memory:', err)
        setSemanticResults(null)
      } finally {
        setIsLoadingSearch(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // View-based filtering
  const activeViewId = searchParams.get('view') ?? 'all-tickets'
  let viewFilteredTickets = tickets
  if (activeViewId === 'my-tickets') {
    viewFilteredTickets = tickets.filter((t) => t.assigned_to === userId)
  } else if (activeViewId === 'sla-at-risk') {
    viewFilteredTickets = tickets.filter((t) =>
      ['atencao', 'vencido'].includes(t.sla_status_resolution ?? '')
    )
  } else if (activeViewId === 'unassigned') {
    viewFilteredTickets = tickets.filter((t) => !t.assigned_to)
  }

  // Apply manual filters on top
  const baseFilteredTickets = viewFilteredTickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  const filteredTickets = (() => {
    if (semanticResults) {
      const semantic = baseFilteredTickets.filter(t => semanticResults.ids.has(t.id))
      return semantic.sort((a, b) => (semanticResults.scores.get(b.id) ?? 0) - (semanticResults.scores.get(a.id) ?? 0))
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return sortTickets(baseFilteredTickets.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(searchLower)
        const accountMatch = t.accounts?.name?.toLowerCase().includes(searchLower)
        return titleMatch || accountMatch
      }))
    }

    return sortTickets(baseFilteredTickets)
  })()

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    setSelectedIds(newSelectedIds)
  }

  const toggleSelectAll = (tickets: any[]) => {
    if (selectedIds.size === tickets.length && tickets.length > 0) {
      setSelectedIds(new Set())
    } else {
      const allIds = new Set(tickets.map(t => t.id))
      setSelectedIds(allIds)
    }
  }

  const handleBulkActionOpen = (action: 'change_status' | 'assign' | 'close') => {
    setBulkActionType(action)
    setBulkActionOpen(true)
  }

  const handleBulkActionConfirm = async (payload: any) => {
    try {
      const res = await fetch('/api/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setUndoSnapshot(data.snapshot)
      toast.success(`${data.updated_count} ticket(s) atualizado(s)!`)

      if (data.errors?.length > 0) {
        toast.error(`Erros: ${data.errors.length} ticket(s) falharam`)
      }

      setSelectedIds(new Set())
      setBulkActionOpen(false)
      setBulkActionType(null)
      router.refresh()
    } catch (err: any) {
      toast.error('Erro na ação em massa: ' + err.message)
    }
  }

  const handleUndo = async () => {
    if (!undoSnapshot) return

    try {
      const res = await fetch('/api/bulk-actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: undoSnapshot }),
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      toast.success(`${data.restored_count} ticket(s) restaurado(s)!`)
      setUndoSnapshot(null)
      router.refresh()
    } catch (err: any) {
      toast.error('Erro ao desfazer: ' + err.message)
    }
  }

  const handleTicketUpdated = (updatedTicket: SupportTicket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
  }

  const handleEmailSync = async () => {
    setIsSubmitting(true)
    toast.info('Sincronizando com Power Automate...', { duration: 3000 })
    try {
      const res = await fetch('/api/support-tickets/email-sync', { method: 'POST' })
      const data = await res.json()
      if (data.created > 0) {
        toast.success(`${data.created} novos chamados!`)
        router.refresh()
      } else {
        toast.info(data.message || 'Tudo atualizado.')
      }
    } catch (e) {
      toast.error('Erro de conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <SuporteKPIs tickets={tickets} />

      <div className="flex justify-end pr-2">
        <Link
          href="/suporte/dashboard"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-plannera-primary hover:text-plannera-orange transition-all flex items-center gap-2 group"
        >
          <LayoutDashboard className="w-4 h-4 transition-transform group-hover:scale-110" />
          Analytics & Control Tower
        </Link>
      </div>

      <div className="flex justify-between items-center border-b border-border-divider/50 pb-6">
        <div className="flex bg-surface-card border border-border-divider p-1.5 rounded-2xl shadow-inner">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10",
                activeTab === tab ? "text-white" : "text-content-secondary hover:text-content-primary"
              )}
            >
              {tab === 'list' ? `Fila Ativa (${tickets.length})` : 'Ingestão Inteligente'}
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab-support"
                  className="absolute inset-0 bg-plannera-primary rounded-xl -z-10 shadow-lg shadow-plannera-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          <Button
            variant="premium"
            size="sm"
            disabled={isSubmitting}
            onClick={handleEmailSync}
            className="bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-2xl h-11 px-8 shadow-lg shadow-plannera-orange/20 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Sincronizar E-mails
          </Button>
        )}
      </div>

      {activeTab === 'list' && (
        <div className="space-y-6">
          <SuporteFilters
            filterStatus={filterStatus}
            onStatusChange={setFilterStatus}
            filterPriority={filterPriority}
            onPriorityChange={setFilterPriority}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoadingSearch={isLoadingSearch}
            hasSemanticResults={!!semanticResults}
            onClearSearch={() => setSearchQuery('')}
            onFilterEditorOpen={() => setShowFilterEditor(true)}
            showCreateViewPopover={showCreateViewPopover}
            onCreateViewOpen={setShowCreateViewPopover}
          />

          <SuporteTable
            tickets={filteredTickets}
            selectedIds={selectedIds}
            previewId={previewId}
            onSelectAll={toggleSelectAll}
            onSelectTicket={toggleSelection}
            onPreview={openPreview}
          />

          <BulkActionBar
            selectedCount={selectedIds.size}
            onClose={() => setSelectedIds(new Set())}
            onChangeStatus={() => handleBulkActionOpen('change_status')}
            onAssign={() => handleBulkActionOpen('assign')}
            onBulkClose={() => handleBulkActionOpen('close')}
          />

          <BulkActionModal
            open={bulkActionOpen}
            onOpenChange={setBulkActionOpen}
            selectedTickets={filteredTickets.filter((t) => selectedIds.has(t.id))}
            action={bulkActionType}
            csms={csms}
            onConfirm={handleBulkActionConfirm}
          />

          {undoSnapshot && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-8 right-8 z-40 bg-surface-card border border-border-divider rounded-2xl p-5 shadow-2xl flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-content-primary">
                  Ação em Massa Realizada
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                className="text-[10px] font-black uppercase tracking-widest text-plannera-primary hover:bg-plannera-primary/5 transition-all"
              >
                Desfazer
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'import' && (
        <SupportBulkImport
          accounts={accounts}
          onImported={() => router.refresh()}
        />
      )}

      <FilterEditorModal
        open={showFilterEditor}
        onOpenChange={setShowFilterEditor}
        tickets={tickets}
      />

      <TicketPreviewPanel
        ticketId={previewId}
        onClose={closePreview}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  )
}
