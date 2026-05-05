'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, FileText } from 'lucide-react'

interface TicketSummarySectionProps {
  ticketId: string
  initialSummary?: string | null
}

export function TicketSummarySection({
  ticketId,
  initialSummary
}: TicketSummarySectionProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary || null)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!initialSummary) {
      loadSummary()
    }
  }, [ticketId, initialSummary])

  async function loadSummary() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/summary`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setGeneratedAt(data.generatedAt)
      }
    } catch (error) {
      console.error('[TicketSummary] Error loading:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegenerate() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/summary`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setGeneratedAt(data.generatedAt)
      }
    } catch (error) {
      console.error('[TicketSummary] Error regenerating:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border-divider bg-surface-card p-3 flex items-center gap-2"
      >
        <Loader2 className="w-4 h-4 text-content-secondary animate-spin" />
        <Text variant="secondary" className="text-sm">
          Gerando resumo...
        </Text>
      </motion.div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-border-divider bg-surface-card p-3"
    >
      <div className="flex items-start gap-3">
        <FileText className="w-4 h-4 text-content-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <Text variant="secondary" className="text-xs font-semibold block mb-1">
            📝 Resumo do Ticket
          </Text>
          <Text as="p" variant="primary" className="text-sm leading-relaxed mb-2">
            {summary}
          </Text>
          {generatedAt && (
            <Text variant="secondary" className="text-[10px]">
              Gerado em {new Date(generatedAt).toLocaleString('pt-BR')}
            </Text>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRegenerate}
          disabled={isLoading}
          title="Regenerar resumo"
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
        </Button>
      </div>
    </motion.div>
  )
}
