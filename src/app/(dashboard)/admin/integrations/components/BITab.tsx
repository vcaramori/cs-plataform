'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, CheckCircle, AlertCircle, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'

interface BIIntegration {
  id: string
  bi_type: 'bigquery' | 'snowflake' | 'tableau' | 'looker'
  is_active: boolean
  created_at: string
  last_export?: string
}

const BI_ICONS: Record<string, React.ReactNode> = {
  bigquery: '📊',
  snowflake: '❄️',
  tableau: '📈',
  looker: '🔍'
}

const BI_COLORS: Record<string, { bg: string; text: string }> = {
  bigquery: { bg: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-600' },
  snowflake: { bg: 'from-cyan-500/10 to-cyan-500/5', text: 'text-cyan-600' },
  tableau: { bg: 'from-purple-500/10 to-purple-500/5', text: 'text-purple-600' },
  looker: { bg: 'from-indigo-500/10 to-indigo-500/5', text: 'text-indigo-600' }
}

interface BITabProps {
  accountId?: string
}

export function BITab({ accountId }: BITabProps) {
  const [integrations, setIntegrations] = useState<BIIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    if (accountId) {
      loadIntegrations()
    } else {
      setIntegrations([])
    }
  }, [accountId])

  async function loadIntegrations() {
    if (!accountId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/integrations/bi?account_id=${accountId}`)
      if (!response.ok) throw new Error('Failed to fetch BI integrations')
      const data = await response.json()
      setIntegrations(data.integrations || [])
    } catch (error) {
      console.error('Error loading BI integrations:', error)
      toast.error('Falha ao carregar integrações BI')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (id: string) => {
    try {
      setExporting(id)
      const response = await fetch('/api/integrations/bi/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_id: id })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Exportação iniciada (${data.records} registros)`)
        loadIntegrations()
      } else {
        toast.error(data.error || 'Erro ao exportar')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Falha ao exportar')
    } finally {
      setExporting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta integração?')) return

    try {
      const response = await fetch(`/api/integrations/bi/${id}`, { method: 'DELETE' })
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
        title={`Integrações BI${integrations.length > 0 ? ` (${integrations.length})` : ''}`}
        action={<Badge variant="outline" className="border-border-divider text-content-secondary text-[10px] font-black uppercase tracking-widest px-3 py-1">Em breve</Badge>}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
        </div>
      ) : integrations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {integrations.map((integration, idx) => {
              const colors = BI_COLORS[integration.bi_type] || BI_COLORS.bigquery
              const label = integration.bi_type.charAt(0).toUpperCase() + integration.bi_type.slice(1)
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
                          {BI_ICONS[integration.bi_type] || '📊'}
                        </div>
                        <div>
                          <h4 className="font-bold text-content-primary">
                            {label}
                          </h4>
                          <p className="text-[10px] text-content-secondary">
                            Data warehouse
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
                          Última Exportação
                        </p>
                        {integration.last_export ? (
                          <p className="text-[10px] text-content-secondary mt-1">
                            {new Date(integration.last_export).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-[10px] text-yellow-600">Nunca exportado</p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border-divider">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[10px]"
                          onClick={() => handleExport(integration.id)}
                          disabled={exporting === integration.id}
                        >
                          {exporting === integration.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3 mr-1" />
                              Exportar
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
          <div className="text-4xl mb-4">📊</div>
          <p className="text-content-secondary mb-2">Nenhuma integração BI configurada</p>
          <Badge variant="outline" className="border-border-divider text-content-secondary text-[10px] font-black uppercase tracking-widest px-3 py-1">
            Conexão BigQuery / Snowflake / Tableau — em breve
          </Badge>
        </div>
      )}
    </>
  )
}
