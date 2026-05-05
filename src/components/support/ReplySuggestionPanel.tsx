'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Lightbulb, Loader2, Check, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

interface ReplySuggestionPanelProps {
  ticketId: string
  onUse?: (suggestion: string) => void
  onDiscard?: () => void
}

export function ReplySuggestionPanel({
  ticketId,
  onUse,
  onDiscard
}: ReplySuggestionPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [sources, setSources] = useState<string[]>([])
  const [suggestionId, setSuggestionId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasError, setHasError] = useState(false)

  async function loadSuggestion() {
    setIsLoading(true)
    setHasError(false)
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/suggest-reply`)
      if (!res.ok) {
        setHasError(true)
        toast.error('Erro ao gerar sugestão')
        return
      }

      const data = await res.json()
      setSuggestion(data.suggestion)
      setConfidence(data.confidence || 0)
      setSources(data.sources || [])

      // Try to fetch suggestion ID from database
      const suggestionRes = await fetch(
        `/api/support-tickets/${ticketId}/suggest-reply`,
        { method: 'GET' }
      )
      if (suggestionRes.ok) {
        const suggestionData = await suggestionRes.json()
        // Note: We'd need to pass back the ID from the endpoint
        // For now, we'll use a placeholder
      }
    } catch (error) {
      console.error('[ReplySuggestion] Error loading:', error)
      setHasError(true)
      toast.error('Erro ao carregar sugestão')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUse() {
    if (!suggestion) return
    setIsProcessing(true)
    try {
      if (suggestionId) {
        const res = await fetch(`/api/support-tickets/${ticketId}/suggest-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'accept',
            suggestionId
          })
        })

        if (!res.ok) {
          toast.error('Erro ao usar sugestão')
          return
        }
      }

      onUse?.(suggestion)
      toast.success('Sugestão aplicada')
      setSuggestion(null)
    } catch (error) {
      console.error('[ReplySuggestion] Error using suggestion:', error)
      toast.error('Erro ao usar sugestão')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleDiscard() {
    setIsProcessing(true)
    try {
      if (suggestionId) {
        const res = await fetch(`/api/support-tickets/${ticketId}/suggest-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            suggestionId
          })
        })

        if (!res.ok) {
          toast.error('Erro ao descartar sugestão')
          return
        }
      }

      setSuggestion(null)
      onDiscard?.()
      toast.info('Sugestão descartada')
    } catch (error) {
      console.error('[ReplySuggestion] Error discarding:', error)
      toast.error('Erro ao descartar sugestão')
    } finally {
      setIsProcessing(false)
    }
  }

  const confidencePercent = Math.round(confidence * 100)
  const showWarning = confidence < 0.8

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <Text variant="secondary" className="text-sm font-medium">
            Sugestão de Resposta
          </Text>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-content-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-content-secondary" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-blue-200 dark:border-blue-800 p-3 space-y-3"
          >
            {/* Loading State */}
            {isLoading && !suggestion ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <Text variant="secondary" className="ml-2 text-sm">
                  Gerando sugestão...
                </Text>
              </div>
            ) : suggestion ? (
              <>
                {/* Suggestion Content */}
                <div className="space-y-2">
                  {showWarning && (
                    <div className="flex items-start gap-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <Text variant="secondary" className="text-xs">
                        Confiança baixa ({confidencePercent}%). Revise antes de usar.
                      </Text>
                    </div>
                  )}

                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900">
                    <Text as="p" variant="primary" className="text-sm leading-relaxed whitespace-pre-wrap">
                      {suggestion}
                    </Text>
                  </div>

                  {/* Sources */}
                  {sources.length > 0 && (
                    <details className="cursor-pointer">
                      <summary className="text-xs text-content-secondary font-medium hover:text-content-primary transition-colors">
                        📚 Baseado em {sources.length} ticket(s) similar(es)
                      </summary>
                      <div className="mt-2 text-[11px] text-content-secondary space-y-1">
                        {sources.map((source, idx) => (
                          <div key={idx} className="ml-4">
                            • Ticket ID: {source.substring(0, 8)}...
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleUse}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span className="ml-1 text-xs font-semibold">Usar</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDiscard}
                    disabled={isProcessing}
                    className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span className="ml-1 text-xs">Descartar</span>
                  </Button>
                </div>

                {/* Disclaimer */}
                <Text variant="secondary" className="text-[10px] italic">
                  🤖 Esta é uma sugestão gerada por IA. Sempre revise antes de enviar.
                </Text>
              </>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Button
                  size="sm"
                  variant="default"
                  onClick={loadSuggestion}
                  disabled={isLoading || hasError}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="ml-1 text-xs font-semibold">Gerar Sugestão</span>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
