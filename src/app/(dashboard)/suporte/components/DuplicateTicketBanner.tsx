'use client'

import React, { useState } from 'react'
import { AlertTriangle, X, Merge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/typography'
import { toast } from 'sonner'

interface DuplicateTicketBannerProps {
  ticketId: string
  candidates: Array<{
    id: string
    ticket_b_id?: string
    ticket_a_id?: string
    similarity_score: number
    other_ticket_title?: string
  }>
  onMergeClick?: (candidateId: string, otherTicketId: string) => void
}

export function DuplicateTicketBanner({
  ticketId,
  candidates,
  onMergeClick
}: DuplicateTicketBannerProps) {
  const [dismissedCandidates, setDismissedCandidates] = useState<Set<string>>(new Set())

  if (!candidates || candidates.length === 0 || dismissedCandidates.size === candidates.length) {
    return null
  }

  const handleDismiss = async (candidateId: string) => {
    try {
      // Mark as dismissed in the database
      const res = await fetch(
        `/api/support-tickets/${ticketId}/similarity-candidates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'dismiss',
            candidate_id: candidateId
          })
        }
      )

      if (!res.ok) throw new Error('Failed to dismiss candidate')

      setDismissedCandidates(prev => new Set(prev).add(candidateId))
      toast.success('Dismissed as false positive')
    } catch (err: any) {
      toast.error(err.message || 'Error dismissing candidate')
    }
  }

  const visibleCandidates = candidates.filter(c => !dismissedCandidates.has(c.id))

  return (
    <div className="space-y-2">
      {visibleCandidates.map(candidate => {
        const otherTicketId = candidate.ticket_b_id || candidate.ticket_a_id
        const percentage = Math.round(candidate.similarity_score * 100)

        return (
          <div
            key={candidate.id}
            className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Text className="font-semibold text-amber-900 dark:text-amber-200">
                  Possible duplicate detected
                </Text>
                <Text variant="secondary" className="text-xs">
                  {percentage}% similar
                </Text>
              </div>
              {candidate.other_ticket_title && (
                <Text variant="secondary" className="text-sm mt-1 truncate">
                  Similar to: <span className="font-mono">{candidate.other_ticket_title}</span>
                </Text>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMergeClick?.(candidate.id, otherTicketId || '')}
                className="gap-1.5 text-xs"
              >
                <Merge className="w-3.5 h-3.5" />
                Merge
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(candidate.id)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
