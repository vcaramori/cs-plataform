'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReopenModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  ticketNumber: string
  onSuccess?: () => void
}

export function ReopenModal({ isOpen, onClose, ticketId, ticketNumber, onSuccess }: ReopenModalProps) {
  const [reason, setReason] = useState('')
  const [isReopening, setIsReopening] = useState(false)

  const reasonLength = reason.length
  const isValid = reasonLength >= 10

  const handleReopen = async () => {
    if (!isValid) {
      toast.error('Reason must be at least 10 characters')
      return
    }

    setIsReopening(true)
    try {
      const res = await fetch(`/api/support-tickets/${ticketId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reopen ticket')
      }

      toast.success('Ticket reopened successfully with your justification')
      setReason('')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error reopening ticket')
    } finally {
      setIsReopening(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl border-premium shadow-premium bg-surface-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-content-primary">
            <RefreshCw className="w-5 h-5 text-accent" />
            Reopen ticket #{ticketNumber}?
          </DialogTitle>
          <DialogDescription className="text-content-secondary">
            Please provide a reason for reopening this ticket. This will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-semibold text-content-primary">
              Reason for reopening
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. Customer responded, we need to continue investigation..."
              className="min-h-[100px] resize-none border-border-divider text-content-primary placeholder:text-content-secondary"
              disabled={isReopening}
            />
            <div className="flex justify-between items-center">
              <span className={`text-xs ${reasonLength < 10 ? 'text-destructive' : 'text-content-secondary'}`}>
                {reasonLength < 10 ? `Minimum 10 characters` : `${reasonLength}/1000 characters`}
              </span>
              {reasonLength >= 10 && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  ✓ Valid
                </span>
              )}
            </div>
          </div>

          {reasonLength > 0 && reasonLength < 10 && (
            <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Reason must be at least 10 characters to prevent empty submissions
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isReopening}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReopen}
            disabled={!isValid || isReopening}
            className="gap-2"
          >
            {isReopening ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reopening...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reopen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
