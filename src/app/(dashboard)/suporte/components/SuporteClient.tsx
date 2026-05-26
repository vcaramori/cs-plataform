'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Account, SupportTicket } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, LayoutDashboard, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
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
import { CreateTicketModal } from './CreateTicketModal'

type TicketWithAccount = SupportTicket & { accounts?: Pick<Account, 'id' | 'name'> | null }

type AccountWithCSM = {
  csm_owner?: {
    id: string
    name: string
  } | null
}

type SemanticSearchResult = {
  id: string
  similarity: number
}


function sortTickets(tickets: TicketWithAccount[]) {
  const priorityMap: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const slaMap: Record<string, number> = { vencido: 0, atencao: 1, no_prazo: 2 }


  return [...tickets].sort((a, b) => {
    const slaA = slaMap[a.sla_status_resolution ?? ''] ?? 99
    const slaB = slaMap[b.sla_status_resolution ?? ''] ?? 99
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
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateViewPopover, setShowCreateViewPopover] = useState(false)
  const [showFilterEditor, setShowFilterEditor] = useState(false)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [semanticResults, setSemanticResults] = useState<{ ids: Set<string>; scores: Map<string, number> } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [undoSnapshot, setUndoSnapshot] = useState<unknown[] | null>(null)

  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<'change_status' | 'assign' | 'close' | null>(null)
  const [csms, setCSMs] = useState<Array<{ id: string; name: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { previewId, openPreview, closePreview } = usePreviewPanel()
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    client: true,
    title: true,
    status: true,
    urgency: false,
    priority: true,
    sla: true,
    opened_at: true,
  })

  // Sincronizar prop de tickets quando alterado no servidor
  useEffect(() => {
    setTickets(initialTickets)
  }, [initialTickets])

  // Fetch CSMs on mount
  useEffect(() => {
    const fetchCSMs = async () => {
      try {
        const res = await fetch('/api/accounts')
        if (res.ok) {
          const data = await res.json()
          const csmList = (data as AccountWithCSM[])
            .filter((account) => account.csm_owner?.id && account.csm_owner?.name)
            .map((account) => ({ id: account.csm_owner!.id, name: account.csm_owner!.name }))
            .filter((item, index, self) => self.findIndex(x => x.id === item.id) === index)

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
          const ids = new Set<string>((data.tickets as SemanticSearchResult[] ?? []).map((t) => t.id))
          const scores = new Map<string, number>((data.tickets as SemanticSearchResult[] ?? []).map((t) => [t.id, t.similarity]))

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
    if (filterStatus === 'active') {
      if (t.status === 'resolved' || t.status === 'closed') return false
    } else if (filterStatus !== 'all' && t.status !== filterStatus) {
      return false
    }
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

  const toggleSelectAll = (tickets: TicketWithAccount[]) => {

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

  const handleBulkActionConfirm = async (payload: Record<string, unknown>) => {

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
    } catch (err) {
      toast.error('Erro na ação em massa: ' + (err as Error).message)
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
    } catch (err) {
      toast.error('Erro ao desfazer: ' + (err as Error).message)
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
    <div className="space-y-4 animate-in fade-in duration-700">
      <SuporteKPIs tickets={tickets} />

      <div className="flex justify-between items-center border-b border-border-divider/50 pb-2">
        <div className="flex bg-surface-card border border-border-divider p-1 rounded-xl shadow-inner gap-1">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all relative z-10",
                activeTab === tab ? "text-white" : "text-content-secondary hover:text-content-primary"
              )}
            >
              {tab === 'list' ? `Fila Ativa (${tickets.length})` : 'Ingestão Inteligente'}
              {activeTab === tab && (
                <motion.div
                  layoutId="active-tab-support"
                  className="absolute inset-0 bg-plannera-primary rounded-lg -z-10 shadow-md shadow-plannera-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-border-divider hover:bg-surface-background/50 text-content-secondary hover:text-content-primary rounded-lg h-9 px-3 text-[11px] font-bold uppercase tracking-wide gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border border-border-divider/50 rounded-xl shadow-xl p-1 z-50">
                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-content-secondary px-3 py-2">Exibir Colunas</DropdownMenuLabel>
                <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-border-divider" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.client}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, client: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Cliente
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.title}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, title: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Título
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.urgency}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, urgency: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Criticidade
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.priority}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, priority: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Prioridade
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.sla}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, sla: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  SLA Resolução
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.opened_at}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, opened_at: !!checked }))}
                  className="text-[10px] font-bold uppercase tracking-wider text-content-primary cursor-pointer hover:bg-surface-background dark:hover:bg-slate-800"
                >
                  Data Abertura
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="border border-border-divider hover:bg-surface-background/50 text-content-secondary hover:text-content-primary rounded-lg h-9 px-4 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Novo Ticket
            </Button>
            <Button
              variant="premium"
              size="sm"
              disabled={isSubmitting}
              onClick={handleEmailSync}
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-lg h-9 px-4 shadow-md shadow-plannera-orange/20 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Sincronizar E-mails
            </Button>
          </div>
        )}
      </div>

      {activeTab === 'list' && (
        <div className="space-y-3">
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
            visibleColumns={visibleColumns}
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
            selectedTickets={filteredTickets.filter((t) => selectedIds.has(t.id)) as any}
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

      <CreateTicketModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        accounts={accounts}
        onSuccess={(newTicket) => {
          const acc = accounts.find((a) => a.id === newTicket.account_id)
          const enriched = {
            ...newTicket,
            accounts: acc ? { id: acc.id, name: acc.name } : null,
          }
          setTickets((prev) => [enriched, ...prev])
          router.refresh()
        }}
      />
    </div>
  )
}
