'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, Webhook, CheckCircle, AlertCircle, Trash2, Key, Globe, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface WebhookItem {
  id: string
  url: string
  events: string[]
  is_active: boolean
  auth_type: string
  created_at: string
}

interface WebhooksTabProps {
  accountId?: string
}

const AVAILABLE_EVENTS = [
  { value: 'ticket.created', label: 'Ticket Criado' },
  { value: 'ticket.updated', label: 'Ticket Atualizado' },
  { value: 'nps.received', label: 'NPS Recebido' },
  { value: 'health.changed', label: 'Health Score Alterado' },
]

export function WebhooksTab({ accountId }: WebhooksTabProps) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['ticket.created'])
  const [authType, setAuthType] = useState<'hmac' | 'bearer' | 'custom'>('hmac')
  const [authToken, setAuthToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (accountId) {
      loadWebhooks()
    } else {
      setWebhooks([])
    }
  }, [accountId])

  async function loadWebhooks() {
    if (!accountId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/webhooks?account_id=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch webhooks')
      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast.error('Falha ao carregar webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este webhook?')) return

    try {
      const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete webhook')
      toast.success('Webhook deletado')
      setWebhooks(webhooks.filter(w => w.id !== id))
    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error('Falha ao deletar webhook')
    }
  }

  const handleTest = async (id: string) => {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: id, event_type: 'test.webhook' })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Webhook testado com sucesso (${data.status_code})`)
      } else {
        toast.error(`Erro no teste: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
      toast.error('Falha ao testar webhook')
    }
  }

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) return

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Por favor, informe uma URL válida (começando com http:// ou https://)')
      return
    }

    if (selectedEvents.length === 0) {
      toast.error('Selecione ao menos um tipo de evento')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          url,
          events: selectedEvents,
          auth_type: authType,
          auth_token: authType !== 'hmac' ? authToken : undefined,
        })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      toast.success('Webhook criado com sucesso!')
      setModalOpen(false)
      
      // Reset form
      setUrl('')
      setSelectedEvents(['ticket.created'])
      setAuthType('hmac')
      setAuthToken('')
      
      loadWebhooks()
    } catch (err: any) {
      toast.error('Falha ao criar webhook: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SectionHeader
        title={`Webhooks${webhooks.length > 0 ? ` (${webhooks.length})` : ''}`}
        action={
          <Button onClick={() => setModalOpen(true)} className="bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-xl shadow-md text-[10px] font-black uppercase tracking-widest px-4 gap-1.5 flex items-center">
            <Plus className="w-3.5 h-3.5" /> Adicionar Webhook
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
        </div>
      ) : webhooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {webhooks.map((webhook, idx) => (
              <motion.div
                key={webhook.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow bg-surface-card border border-border-divider/50 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between mb-4 pl-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Webhook className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                        <h4 className="font-bold text-xs text-content-primary truncate uppercase tracking-wide">
                          {new URL(webhook.url).hostname}
                        </h4>
                        <p className="text-[9px] font-mono text-content-secondary/60 truncate">
                          {webhook.url}
                        </p>
                      </div>
                    </div>
                    {webhook.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-3 pl-1">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-content-secondary/40 mb-2">
                        Eventos ({webhook.events.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-[8px] font-black uppercase tracking-wide border-border-divider px-2 py-0.5 rounded bg-surface-background/50">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wide border-border-divider px-2 py-0.5 rounded bg-surface-background/50">
                            +{webhook.events.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border-divider/50 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[9px] font-black uppercase tracking-widest h-8 rounded-lg hover:bg-surface-background"
                        onClick={() => handleTest(webhook.id)}
                      >
                        Testar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10 h-8 px-3 rounded-lg"
                        onClick={() => handleDelete(webhook.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider/50 rounded-2xl text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4 border border-orange-500/20">
            <Webhook className="w-7 h-7 text-orange-500" />
          </div>
          <p className="text-content-secondary/60 text-xs font-semibold mb-4">Nenhum webhook configurado para esta conta</p>
          <Button onClick={() => setModalOpen(true)} className="bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-xl shadow-md text-[10px] font-black uppercase tracking-widest px-5 py-2">
            Criar Primeiro Webhook
          </Button>
        </div>
      )}

      {/* Dialog creation modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#0b0f19] border-border-divider/50 shadow-2xl p-6 sm:rounded-2xl overflow-hidden focus:outline-none z-50">
          <DialogHeader className="border-b border-border-divider/30 pb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-[#1e293b] dark:text-white flex items-center gap-2">
              <Webhook className="w-5 h-5 text-plannera-orange" />
              Configurar Novo Webhook
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateWebhook} className="flex flex-col space-y-4 pt-4">
            {/* URL input */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                URL de Destino (Endpoint HTTP POST) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="url"
                  placeholder="https://suaapi.com/webhooks/tickets"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="pl-9 h-9 text-xs border-border-divider/60 rounded-lg focus-visible:ring-1 focus-visible:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white"
                />
              </div>
            </div>

            {/* Event subscription checkboxes */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                Assinar Eventos <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-border-divider/40">
                {AVAILABLE_EVENTS.map((event) => {
                  const isChecked = selectedEvents.includes(event.value)
                  return (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`event-check-${event.value}`}
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, event.value])
                          } else {
                            setSelectedEvents(selectedEvents.filter(x => x !== event.value))
                          }
                        }}
                        className="w-4 h-4 rounded text-plannera-orange focus:ring-plannera-orange/40 cursor-pointer"
                      />
                      <label htmlFor={`event-check-${event.value}`} className="text-[11px] text-content-primary font-medium cursor-pointer">
                        {event.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Auth Type selection */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                Método de Autenticação
              </Label>
              <Select value={authType} onValueChange={(val: any) => setAuthType(val)}>
                <SelectTrigger className="h-9 border-border-divider/60 rounded-lg text-xs font-normal normal-case focus:ring-1 focus:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#0c101b] border border-border-divider/60 rounded-lg z-[60]">
                  <SelectItem value="hmac" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Assinatura HMAC-SHA256 (Recomendado)</SelectItem>
                  <SelectItem value="bearer" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Token Bearer (Authorization)</SelectItem>
                  <SelectItem value="custom" className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800">Chave Customizada (X-API-Key)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Token input (if auth is not hmac) */}
            {authType !== 'hmac' && (
              <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                <Label className="text-[10px] font-black uppercase tracking-widest text-[#475569] dark:text-slate-400">
                  Token / Chave Secreta <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder={authType === 'bearer' ? 'ex: eyJhbGciOiJIUzI1Ni...' : 'ex: api-key-token-value'}
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs border-border-divider/60 rounded-lg focus-visible:ring-1 focus-visible:ring-plannera-orange/40 bg-surface-card/40 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Info label for HMAC signature */}
            {authType === 'hmac' && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <p className="text-[10px] leading-relaxed text-slate-400">
                  <span className="font-bold text-plannera-orange uppercase">Nota:</span> A assinatura de segurança HMAC será enviada automaticamente no cabeçalho <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] rounded text-content-primary">X-Webhook-Signature</code> gerada usando uma chave secreta exclusiva.
                </p>
              </div>
            )}

            <DialogFooter className="border-t border-border-divider/30 pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setModalOpen(false)}
                className="h-9 border-border-divider/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-lg px-5 shadow-md shadow-plannera-orange/20 text-[10px] font-black uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Webhook"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
