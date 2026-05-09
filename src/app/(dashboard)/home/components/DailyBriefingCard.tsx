'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, X, Sparkles } from 'lucide-react'
import { DailyBriefing } from '@/lib/supabase/types'

export function DailyBriefingCard() {
  const { data: briefing, isLoading, refetch } = useQuery({
    queryKey: ['daily-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/daily-briefing')
      if (!res.ok) return null
      return (await res.json()) as DailyBriefing | null
    },
    staleTime: 1000 * 60 * 5,
  })

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/daily-briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      })
      if (!res.ok) throw new Error('Failed to dismiss briefing')
      return res.json()
    },
    onSuccess: () => refetch()
  })

  if (isLoading) return <Skeleton className="h-32 rounded-lg" />

  const priorities = briefing?.priorities || {}
  const isDismissed = briefing?.dismissed_at !== null && briefing?.dismissed_at !== undefined

  if (!briefing || isDismissed) return null

  return (
    <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Daily Briefing por IA</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[priorities.priority_1, priorities.priority_2, priorities.priority_3]
            .filter(Boolean)
            .map((p: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-surface-card/50 rounded-lg border border-border-divider">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-content-primary text-sm">{p.title}</p>
                  <p className="text-xs text-content-secondary mt-1">{p.account_name}</p>
                  <p className="text-xs text-content-secondary/70 mt-1.5">{p.action}</p>
                </div>
                <div className={cn(
                  'text-xs font-bold uppercase tracking-tight px-2 py-1 rounded',
                  p.urgency === 'critical' && 'bg-red-500/20 text-destructive',
                  p.urgency === 'high' && 'bg-warning/20 text-amber-600',
                  p.urgency === 'medium' && 'bg-blue-500/20 text-blue-600',
                )}>
                  {p.urgency}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
