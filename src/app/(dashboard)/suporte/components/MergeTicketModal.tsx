'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Merge, AlertCircle, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const supabase = getSupabaseBrowserClient()

interface TicketSummary {
  id: string
  title: string
  status: string
  created_at: string
}

interface MergeTicketModalProps {
  isOpen: boolean
  onClose: () => void
  secondaryTicket: { id: string; title: string; account_id: string }
  onSuccess?: () => void
}

export function MergeTicketModal({ isOpen, onClose, secondaryTicket, onSuccess }: MergeTicketModalProps) {
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [reason, setReason] = useState('Ticket duplicado')
  const [isMerging, setIsMerging] = useState(false)

  // Fetch candidates from the same account
  useEffect(() => {
    if (!isOpen || !secondaryTicket.account_id) return

    const fetchCandidates = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, title, status, created_at')
        .eq('account_id', secondaryTicket.account_id)
        .neq('id', secondaryTicket.id)
        .neq('status', 'closed')
        .ilike('title', `%${search}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setTickets(data)
      }
      setLoading(false)
    }

    const timer = setTimeout(fetchCandidates, 300)
    return () => clearTimeout(timer)
  }, [search, secondaryTicket.account_id, secondaryTicket.id, isOpen])

  const handleMerge = async () => {
    if (!selectedTicketId) return

    setIsMerging(true)
    try {
      const res = await fetch(`/api/support-tickets/${secondaryTicket.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryTicketId: selectedTicketId, reason }),
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success('Tickets mesclados com sucesso!')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(`Erro ao mesclar: ${err.message}`)
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border-premium shadow-premium bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Merge className="w-5 h-5 text-primary" />
            Mesclar Ticket
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            O ticket <strong>"{secondaryTicket.title}"</strong> será fechado e anexado ao ticket principal escolhido abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Buscar Ticket Principal (mesma conta)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ex: Erro no login..."
                className="pl-10 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length > 0 ? (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1",
                    selectedTicketId === t.id 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium text-sm line-clamp-1">{t.title}</span>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status: {t.status}</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : search.length > 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum ticket encontrado.
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Motivo da Mesclagem</Label>
            <Input
              placeholder="Ex: Assunto duplicado"
              className="rounded-xl"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-warning-200 dark:border-warning-900/50 flex gap-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>Esta ação não pode ser desfeita. O ticket secundário ficará marcado como mesclado e não poderá mais ser editado.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={handleMerge} 
            disabled={!selectedTicketId || isMerging}
            className="rounded-xl gap-2"
          >
            {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
            Confirmar Mesclagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
