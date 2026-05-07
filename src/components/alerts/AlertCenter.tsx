'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ProactiveAlert } from '@/lib/supabase/types'

const severityConfig = {
  critical: {
    label: 'Crítico',
    bg: 'bg-red-100 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    icon: '🔴'
  },
  warning: {
    label: 'Aviso',
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: '🟡'
  },
  info: {
    label: 'Info',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    icon: '🔵'
  }
}

export function AlertCenter() {
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  const { data: alerts = [], refetch } = useQuery({
    queryKey: ['proactive-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/proactive-alerts')
      if (!res.ok) throw new Error('Failed to fetch alerts')
      return res.json() as Promise<ProactiveAlert[]>
    },
    refetchInterval: 30000 // Poll a cada 30s
  })

  const criticalCount = alerts.filter(a => a.severity === 'critical').length

  const handleResolve = async (alertId: string) => {
    setResolving(prev => new Set([...prev, alertId]))

    try {
      const res = await fetch(`/api/proactive-alerts/${alertId}/resolve`, {
        method: 'PATCH'
      })
      if (res.ok) {
        toast.success('Alerta resolvido')
        refetch()
      } else {
        toast.error('Erro ao resolver alerta')
        setResolving(prev => {
          const newSet = new Set(prev)
          newSet.delete(alertId)
          return newSet
        })
      }
    } catch (e) {
      toast.error('Erro ao resolver alerta')
      setResolving(prev => {
        const newSet = new Set(prev)
        newSet.delete(alertId)
        return newSet
      })
    }
  }

  return (
    <>
      {/* Badge no navbar */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 hover:bg-surface-card rounded-lg transition"
        aria-label="Alertas"
        title="Alertas proativos"
      >
        <Bell className="w-5 h-5 text-content-primary" />
        {criticalCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-96 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Alertas Proativos ({alerts.length})</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {alerts.length === 0 ? (
              <Card className="border-dashed p-8 text-center">
                <p className="text-content-secondary text-sm">Nenhum alerta ativo</p>
              </Card>
            ) : (
              alerts.map(alert => {
                const config = severityConfig[alert.severity]
                const isResolving = resolving.has(alert.id)

                return (
                  <Card key={alert.id} className={cn('p-4', config.bg)}>
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-xl mt-0.5">{config.icon}</div>
                          <div className="flex-1">
                            <Badge className={cn('text-[10px] font-bold mb-1', config.bg, config.text)}>
                              {config.label}
                            </Badge>
                            <p className="text-sm font-semibold text-content-primary">
                              {alert.message}
                            </p>
                            {alert.metadata?.recommendation && (
                              <p className="text-xs text-content-secondary mt-2">
                                💡 {alert.metadata.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResolve(alert.id)}
                          disabled={isResolving}
                          className="text-xs"
                        >
                          {isResolving ? '...' : <X className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
