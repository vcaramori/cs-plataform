'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BulkActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTickets: Array<{ id: string; title: string; accounts?: { name: string } }>
  action: 'change_status' | 'assign' | 'close' | null
  csms?: Array<{ id: string; name: string }>
  onConfirm: (payload: any) => Promise<void>
}

const statusOptions = [
  { label: 'Aberto', value: 'open' },
  { label: 'Em Progresso', value: 'in-progress' },
  { label: 'Resolvido', value: 'resolved' },
  { label: 'Fechado', value: 'closed' },
]

export function BulkActionModal({
  open,
  onOpenChange,
  selectedTickets,
  action,
  csms = [],
  onConfirm,
}: BulkActionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedValue, setSelectedValue] = useState('')

  const handleConfirm = async () => {
    if (!selectedValue) {
      toast.error('Selecione um valor')
      return
    }

    setIsLoading(true)
    try {
      const payload: any = {
        action,
        ticket_ids: selectedTickets.map((t) => t.id),
        payload: {},
      }

      if (action === 'change_status') {
        payload.payload.status = selectedValue
      } else if (action === 'assign') {
        payload.payload.assigned_to = selectedValue
      }

      await onConfirm(payload)
      onOpenChange(false)
      setSelectedValue('')
    } finally {
      setIsLoading(false)
    }
  }

  const getTitle = () => {
    switch (action) {
      case 'change_status':
        return `Mudar status de ${selectedTickets.length} ticket${selectedTickets.length !== 1 ? 's' : ''}?`
      case 'assign':
        return `Atribuir ${selectedTickets.length} ticket${selectedTickets.length !== 1 ? 's' : ''}?`
      case 'close':
        return `Fechar ${selectedTickets.length} ticket${selectedTickets.length !== 1 ? 's' : ''}?`
      default:
        return 'Confirmar ação'
    }
  }

  const visibleTickets = selectedTickets.slice(0, 5)
  const remainingCount = selectedTickets.length - visibleTickets.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita imediatamente. Use o botão "Desfazer" no toast.
          </DialogDescription>
        </DialogHeader>

        {/* Ticket List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {visibleTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-3 bg-surface-background rounded border border-border-divider text-sm"
            >
              <p className="font-semibold text-content-primary truncate">
                {ticket.title}
              </p>
              <p className="text-[10px] text-content-secondary opacity-60">
                {ticket.accounts?.name || 'Sem conta'} • {ticket.id.slice(0, 8)}
              </p>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-[10px] font-bold text-content-secondary p-3">
              + {remainingCount} mais
            </div>
          )}
        </div>

        {/* Value Selector */}
        {action === 'change_status' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2 block">
              Novo Status
            </label>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {action === 'assign' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2 block">
              Atribuir Para
            </label>
            <SearchableSelect
              value={selectedValue}
              onValueChange={setSelectedValue}
              options={csms.map((csm) => ({ label: csm.name, value: csm.id }))}
              placeholder="Selecionar CSM"
              size="sm"
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-plannera-primary hover:bg-plannera-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
