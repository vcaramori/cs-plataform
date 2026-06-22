'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Clock, CheckCircle2, X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AutoCheckInQueueItem } from '@/lib/supabase/types'

export function AutoCheckInQueue() {
  const [selectedItem, setSelectedItem] = useState<AutoCheckInQueueItem | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  const { data: queueItems = [], refetch } = useQuery({
    queryKey: ['auto-checkin-queue'],
    queryFn: async () => {
      const res = await fetch('/api/auto-checkin-queue')
      if (!res.ok) throw new Error('Failed to fetch queue')
      return res.json() as Promise<AutoCheckInQueueItem[]>
    },
    refetchInterval: 30000 // Poll every 30s
  })

  // Filter to pending and edited items only
  const pendingItems = queueItems.filter(
    item => item.status === 'pending' || item.status === 'edited'
  )

  const handleSelectItem = (item: AutoCheckInQueueItem) => {
    setSelectedItem(item)
    setEditedSubject(item.edited_subject || item.generated_subject)
    setEditedBody(item.edited_body || item.generated_body)
    setEditMode(false)
  }

  const handleApprove = async () => {
    if (!selectedItem) return
    setActionLoading(prev => new Set([...prev, selectedItem.id]))

    try {
      const res = await fetch(`/api/auto-checkin-queue/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve'
        })
      })

      if (res.ok) {
        toast.success('Check-in aprovado')
        refetch()
        setSelectedItem(null)
      } else {
        toast.error('Erro ao aprovar')
      }
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      toast.error('Erro ao aprovar check-in')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedItem!.id)
        return newSet
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedItem) return
    setActionLoading(prev => new Set([...prev, selectedItem.id]))

    try {
      const res = await fetch(`/api/auto-checkin-queue/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          edited_subject: editedSubject,
          edited_body: editedBody
        })
      })

      if (res.ok) {
        toast.success('Check-in editado e salvo')
        refetch()
        setSelectedItem(null)
        setEditMode(false)
      } else {
        toast.error('Erro ao editar')
      }
    } catch (err) {
      console.error('Erro ao editar:', err)
      toast.error('Erro ao editar check-in')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedItem!.id)
        return newSet
      })
    }
  }

  const handleCancel = async (itemId: string) => {
    setActionLoading(prev => new Set([...prev, itemId]))

    try {
      const res = await fetch(`/api/auto-checkin-queue/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel'
        })
      })

      if (res.ok) {
        toast.success('Check-in cancelado')
        refetch()
      } else {
        toast.error('Erro ao cancelar')
      }
    } catch (err) {
      console.error('Erro ao cancelar:', err)
      toast.error('Erro ao cancelar check-in')
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  if (pendingItems.length === 0) {
    return null
  }

  return (
    <>
      <Card className="mb-6 border-warning-200 dark:border-warning-900 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-600" />
              Check-ins Pendentes de Aprovação
            </CardTitle>
            <Badge variant="destructive" className="bg-amber-600">
              {pendingItems.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingItems.map((item) => {
            const isOverdue = new Date(item.approval_deadline) < new Date()
            const timeUntilDeadline = formatDistance(
              new Date(item.approval_deadline),
              new Date(),
              { locale: ptBR }
            )

            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-border cursor-pointer hover:border-warning-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1 text-foreground">
                      {item.edited_subject || item.generated_subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.edited_body || item.generated_body}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {item.status === 'edited' && (
                        <Badge variant="secondary" className="text-[10px]">
                          Editado
                        </Badge>
                      )}
                      <span className={cn(
                        'text-xs flex items-center gap-1',
                        isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                      )}>
                        <Clock className="w-3 h-3" />
                        {isOverdue ? 'Expirado' : `Vence em ${timeUntilDeadline}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectItem(item)
                    }}
                    className="shrink-0"
                  >
                    Ver
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => {
          if (!open) setSelectedItem(null)
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Revisar Check-in Automático</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div>
                    <label className="text-xs font-bold opacity-60 uppercase mb-2 block">
                      Assunto
                    </label>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                      {selectedItem.edited_subject || selectedItem.generated_subject}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 uppercase mb-2 block">
                      Corpo do E-mail
                    </label>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedItem.edited_body || selectedItem.generated_body}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(selectedItem.approval_deadline) < new Date()
                        ? 'Prazo expirado'
                        : `Aprovação requerida até ${format(
                            new Date(selectedItem.approval_deadline),
                            'HH:mm',
                            { locale: ptBR }
                          )}`}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold opacity-60 uppercase mb-2 block">
                      Assunto
                    </label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      maxLength={60}
                      className="w-full bg-muted/30 border border-border rounded-lg p-2 text-sm focus:outline-none text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 uppercase mb-2 block">
                      Corpo do E-mail
                    </label>
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={6}
                      className="w-full bg-muted/30 border border-border rounded-lg p-3 text-sm focus:outline-none resize-none text-foreground"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                {!editMode ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(selectedItem.id)}
                      disabled={actionLoading.has(selectedItem.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(true)}
                      disabled={actionLoading.has(selectedItem.id)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={actionLoading.has(selectedItem.id)}
                    >
                      {actionLoading.has(selectedItem.id) ? (
                        <>Aprovando...</>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Aprovar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      Cancelar edição
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEdit}
                      disabled={actionLoading.has(selectedItem.id)}
                    >
                      {actionLoading.has(selectedItem.id) ? (
                        <>Salvando...</>
                      ) : (
                        <>Salvar e Aprovar</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
