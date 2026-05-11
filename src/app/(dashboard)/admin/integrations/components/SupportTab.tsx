'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, CheckCircle, AlertCircle, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface SupportIntegration {
  id: string
  support_type: 'zendesk' | 'jira_sd'
  is_active: boolean
  created_at: string
  last_sync?: string
}

const SUPPORT_ICONS: Record<string, React.ReactNode> = {
  zendesk: '🎟️',
  jira_sd: '⚙️'
}

const SUPPORT_COLORS: Record<string, { bg: string; text: string }> = {
  zendesk: { bg: 'from-teal-500/10 to-teal-500/5', text: 'text-teal-600' },
  jira_sd: { bg: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-600' }
}

export function SupportTab() {
  const [integrations, setIntegrations] = useState<SupportIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [])

  async function loadIntegrations() {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations/support')
      if (!response.ok) throw new Error('Failed to fetch support integrations')
      const data = await response.json()
      setIntegrations(data.integrations || [])
    } catch (error) {
      console.error('Error loading support integrations:', error)
      toast.error('Falha ao carregar integrações de suporte')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (id: string) => {
    try {
      setSyncing(id)
      const response = await fetch('/api/integrations/support/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_id: id, sync_type: 'tickets' })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Sincronização iniciada (${data.synced} tickets)`)
        loadIntegrations()
      } else {
        toast.error(data.error || 'Erro ao sincronizar')
      }
    } catch (error) {
      console.error('Error syncing support:', error)
      toast.error('Falha ao sincronizar')
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta integração?')) return

    try {
      const response = await fetch(`/api/integrations/support/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Integração deletada')
      setIntegrations(integrations.filter(i => i.id !== id))
    } catch (error) {
      console.error('Error deleting integration:', error)
      toast.error('Falha ao deletar')
    }
  }

  return (
    <>
      <SectionHeader
        title={`Integrações de Suporte${integrations.length > 0 ? ` (${integrations.length})` : ''}`}
        action={<Button className="bg-plannera-orange hover:bg-plannera-orange/90">Adicionar Suporte</Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
        </div>
      ) : integrations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {integrations.map((integration, idx) => {
              const colors = SUPPORT_COLORS[integration.support_type] || SUPPORT_COLORS.zendesk
              const label = integration.support_type === 'jira_sd' ? 'Jira Service Desk' : 'Zendesk'
              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`p-6 hover:shadow-lg transition-shadow bg-gradient-to-br ${colors.bg}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-surface-background flex items-center justify-center text-lg ${colors.text}`}>
                          {SUPPORT_ICONS[integration.support_type] || '🎟️'}
                        </div>
                        <div>
                          <h4 className="font-bold text-content-primary">
                            {label}
                          </h4>
                          <p className="text-[10px] text-content-secondary">
                            Integração ativa
                          </p>
                        </div>
                      </div>
                      {integration.is_active ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">
                          Sincronização de Tickets
                        </p>
                        {integration.last_sync ? (
                          <p className="text-[10px] text-content-secondary mt-1">
                            Última: {new Date(integration.last_sync).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-[10px] text-yellow-600">Nunca sincronizado</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border-divider">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[10px]"
                          onClick={() => handleSync(integration.id)}
                          disabled={syncing === integration.id}
                        >
                          {syncing === integration.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 mr-1" />
                              Sincronizar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => handleDelete(integration.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center">
          <div className="text-4xl mb-4">🎟️</div>
          <p className="text-content-secondary mb-4">Nenhuma integração de suporte configurada</p>
          <Button className="bg-plannera-orange hover:bg-plannera-orange/90">
            Conectar Zendesk ou Jira
          </Button>
        </div>
      )}
    </>
  )
}
