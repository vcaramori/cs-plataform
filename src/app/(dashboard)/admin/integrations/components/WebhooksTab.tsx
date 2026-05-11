'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, Webhook, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface WebhookItem {
  id: string
  url: string
  events: string[]
  is_active: boolean
  auth_type: string
  created_at: string
}

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function loadWebhooks() {
    try {
      setLoading(true)
      const response = await fetch('/api/webhooks')
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

  return (
    <>
      <SectionHeader
        title={`Webhooks${webhooks.length > 0 ? ` (${webhooks.length})` : ''}`}
        action={<Button className="bg-plannera-orange hover:bg-plannera-orange/90">Adicionar Webhook</Button>}
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
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Webhook className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-content-primary truncate">
                          {new URL(webhook.url).hostname}
                        </h4>
                        <p className="text-[10px] font-mono text-content-secondary truncate">
                          {webhook.url}
                        </p>
                      </div>
                    </div>
                    {webhook.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-content-secondary mb-2">
                        Eventos ({webhook.events.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-[10px]">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{webhook.events.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border-divider">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[10px]"
                        onClick={() => handleTest(webhook.id)}
                      >
                        Testar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
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
        <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center">
          <Webhook className="w-12 h-12 text-border-divider mx-auto mb-4" />
          <p className="text-content-secondary mb-4">Nenhum webhook configurado</p>
          <Button className="bg-plannera-orange hover:bg-plannera-orange/90">
            Criar Primeiro Webhook
          </Button>
        </div>
      )}
    </>
  )
}
