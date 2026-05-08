'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, TrendingUp, Target, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyHomePriority } from '@/lib/supabase/types'

export function HomePrioritiesClient() {
  const { data: priorities, isLoading } = useQuery({
    queryKey: ['home-priorities'],
    queryFn: async () => {
      const res = await fetch('/api/home-priorities')
      if (!res.ok) throw new Error('Failed to fetch priorities')
      return (await res.json()) as (DailyHomePriority & { accounts: { name: string; segment: string } })[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const categorized = {
    focar_agora: priorities?.filter(p => p.category === 'focar_agora') || [],
    manter_momentum: priorities?.filter(p => p.category === 'manter_momentum') || [],
    oportunidade: priorities?.filter(p => p.category === 'oportunidade') || [],
  }

  const categoryConfig = {
    focar_agora: {
      label: 'Focar Agora',
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    manter_momentum: {
      label: 'Manter Momentum',
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    oportunidade: {
      label: 'Oportunidade',
      icon: Target,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  }

  return (
    <div className="space-y-8">
      {Object.entries(categorized).map(([key, items]) => {
        const config = categoryConfig[key as keyof typeof categoryConfig]
        const Icon = config.icon

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className={cn('w-5 h-5', config.color)} />
              <h2 className="text-lg font-bold text-content-primary">{config.label}</h2>
              <span className="ml-auto text-xs font-bold text-content-secondary bg-surface-card px-3 py-1 rounded-full">
                {items.length} conta(s)
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-content-secondary text-sm">Nenhuma prioridade nesta categoria hoje.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {items.map(priority => (
                  <Link key={priority.id} href={`/accounts/${priority.account_id}`}>
                    <Card className={cn('cursor-pointer transition-all hover:shadow-md', config.border, config.bg)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-content-primary truncate">
                              {(priority as any).accounts?.name || 'Conta'}
                            </p>
                            <p className="text-sm text-content-secondary mt-1">{priority.reason}</p>
                            {priority.action_type && (
                              <p className="text-xs font-mono text-content-secondary/60 mt-2 uppercase tracking-tight">
                                Ação: {priority.action_type.replace(/_/g, ' ')}
                              </p>
                            )}
                          </div>
                          <ArrowRight className={cn('w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1', config.color)} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
