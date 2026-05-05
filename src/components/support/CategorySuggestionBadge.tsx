'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Zap, Check, X, Loader2 } from 'lucide-react'

interface CategorySuggestionBadgeProps {
  ticketId: string
  suggestedCategory: string | null | undefined
  confidence: number | null | undefined
  reasoning: string | null | undefined
  onAccepted?: () => void
  onRejected?: () => void
}

export function CategorySuggestionBadge({
  ticketId,
  suggestedCategory,
  confidence,
  reasoning,
  onAccepted,
  onRejected
}: CategorySuggestionBadgeProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Don't render if no suggestion
  if (!suggestedCategory || !isVisible) {
    return null
  }

  const confidencePercent = Math.round((confidence ?? 0) * 100)
  const showConfidenceWarning = (confidence ?? 0) < 0.8

  async function handleAccept() {
    setIsProcessing(true)
    try {
      // Fetch latest suggestion ID
      const suggestionRes = await fetch(
        `/api/support-tickets/${ticketId}/categorization-suggestion`
      )
      if (!suggestionRes.ok) throw new Error('Failed to fetch suggestion')

      const { suggestion } = await suggestionRes.json()
      if (!suggestion) throw new Error('No suggestion found')

      // Accept suggestion
      const res = await fetch(
        `/api/support-tickets/${ticketId}/categorization-suggestion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'accept',
            suggestionId: suggestion.id
          })
        }
      )

      if (!res.ok) throw new Error('Failed to accept suggestion')

      toast.success(`Categoria "${suggestedCategory}" aplicada`)
      setIsVisible(false)
      onAccepted?.()
    } catch (error) {
      console.error('[CategorySuggestion] Error accepting:', error)
      toast.error('Erro ao aplicar sugestão')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleReject() {
    setIsProcessing(true)
    try {
      // Fetch latest suggestion ID
      const suggestionRes = await fetch(
        `/api/support-tickets/${ticketId}/categorization-suggestion`
      )
      if (!suggestionRes.ok) throw new Error('Failed to fetch suggestion')

      const { suggestion } = await suggestionRes.json()
      if (!suggestion) throw new Error('No suggestion found')

      // Reject suggestion
      const res = await fetch(
        `/api/support-tickets/${ticketId}/categorization-suggestion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            suggestionId: suggestion.id
          })
        }
      )

      if (!res.ok) throw new Error('Failed to reject suggestion')

      toast.info('Sugestão descartada')
      setIsVisible(false)
      onRejected?.()
    } catch (error) {
      console.error('[CategorySuggestion] Error rejecting:', error)
      toast.error('Erro ao descartar sugestão')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="category-suggestion"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 flex items-start gap-3"
      >
        <div className="flex items-start gap-2 flex-1 pt-0.5">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Text variant="secondary" className="text-sm font-medium">
                Sugestão de Categoria
              </Text>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs font-semibold',
                  showConfidenceWarning
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}
              >
                {confidencePercent}%
              </Badge>
            </div>
            <p className="text-sm text-content-primary font-semibold mb-1">
              {suggestedCategory}
            </p>
            {reasoning && (
              <Text variant="secondary" className="text-xs mb-2">
                {reasoning}
              </Text>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAccept}
            disabled={isProcessing}
            className="text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span className="ml-1 hidden sm:inline text-xs">Aceitar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            disabled={isProcessing}
            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            <span className="ml-1 hidden sm:inline text-xs">Rejeitar</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
