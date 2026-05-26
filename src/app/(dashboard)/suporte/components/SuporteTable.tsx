'use client'

import { SupportTicket, Account } from '@/lib/supabase/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { TicketCheck } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { TicketListRow } from './TicketListRow'

interface SuporteTableProps {
  tickets: (SupportTicket & { accounts?: Pick<Account, 'id' | 'name'> | null })[]
  selectedIds: Set<string>
  previewId: string | null
  visibleColumns: Record<string, boolean>
  onSelectAll: (tickets: any[]) => void
  onSelectTicket: (id: string) => void
  onPreview: (id: string) => void
}

export function SuporteTable({
  tickets,
  selectedIds,
  previewId,
  visibleColumns,
  onSelectAll,
  onSelectTicket,
  onPreview,
}: SuporteTableProps) {
  const isAllSelected = tickets.length > 0 && selectedIds.size === tickets.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < tickets.length

  // Calculate dynamic colSpan based on visible columns
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length
  const colSpan = visibleCount + 1 // +1 for checkbox column

  return (
    <div className="bg-surface-card border border-border-divider rounded-xl shadow-lg overflow-hidden backdrop-blur-md">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-surface-background/50">
            <TableRow className="hover:bg-transparent border-b border-border-divider">
              <TableHead className="w-12 h-11 flex items-center justify-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => onSelectAll(tickets)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              {visibleColumns.client && (
                <TableHead className="pl-10 h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary">Cliente</TableHead>
              )}
              {visibleColumns.title && (
                <TableHead className="h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary">Título do Chamado</TableHead>
              )}
              {visibleColumns.status && (
                <TableHead className="h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary text-center">Status</TableHead>
              )}
              {visibleColumns.urgency && (
                <TableHead className="h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary text-center">Urgência</TableHead>
              )}
              {visibleColumns.priority && (
                <TableHead className="h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary text-center">Prioridade</TableHead>
              )}
              {visibleColumns.sla && (
                <TableHead className="h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary text-center">SLA Resolução</TableHead>
              )}
              {visibleColumns.opened_at && (
                <TableHead className="pr-10 h-11 text-[10px] font-bold uppercase tracking-wider text-content-secondary text-right">Abertura</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode='popLayout'>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-60 grayscale">
                      <TicketCheck className="w-12 h-12 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum chamado pendente</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TicketListRow
                    key={t.id}
                    ticket={t}
                    isSelected={selectedIds.has(t.id)}
                    visibleColumns={visibleColumns}
                    onSelect={(id) => onSelectTicket(id)}
                    onPreview={(id) => onPreview(id)}
                    isHighlighted={previewId === t.id}
                  />
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
