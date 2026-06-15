'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IndicatorCard } from './IndicatorCard'
import { IndicatorDetailsModal } from './IndicatorDetailsModal'
import { IndicatorEditModal } from './IndicatorEditModal'
import { AddIndicatorModal } from './AddIndicatorModal'

export function SuccessPlan({ accountName }: { accountName?: string }) {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const queryClient = useQueryClient()

  const [selectedIndicator, setSelectedIndicator] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Fetch indicators
  const { data, isLoading, error } = useQuery({
    queryKey: ['account-indicators', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/indicators`)
      if (!res.ok) throw new Error('Failed to fetch indicators')
      return res.json() as Promise<{ indicators: any[] }>
    }
  })

  const indicators = data?.indicators || []
  const currentSelectedIndicator = indicators.find(i => i.id === selectedIndicator?.id)

  const handleOpenDetails = (indicator: any) => {
    setSelectedIndicator(indicator)
    setIsDetailsOpen(true)
  }

  const handleOpenEdit = () => {
    setIsEditOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsAddOpen(true)} variant="outline" size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-3.5 h-3.5" />
          Nova Meta
        </Button>
      </div>

      {indicators.length === 0 ? (
        <Card className="border-dashed p-10 text-center bg-surface-background/50">
          <p className="text-content-secondary text-[10px] font-black uppercase tracking-widest">Nenhuma meta estratégica definida</p>
          <button onClick={() => setIsAddOpen(true)} className="mt-3 text-plannera-orange text-[10px] font-black uppercase tracking-widest hover:underline">
            + Cadastrar primeira meta
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {indicators.map((indicator, idx) => (
            <IndicatorCard
              key={indicator.id}
              index={idx}
              indicator={indicator}
              history={indicator.history || []}
              onClick={() => handleOpenDetails(indicator)}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => router.push(`/accounts/${accountId}/success-plan`)}
        className="w-full py-3 rounded-xl border border-border-divider bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 group"
      >
        Abrir Plano Completo
        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </button>

      <AddIndicatorModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        accountId={accountId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] })}
      />

      <IndicatorDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        indicator={currentSelectedIndicator}
        history={currentSelectedIndicator?.history || []}
        accountName={accountName || 'Cliente'}
        onAddDataPoint={handleOpenEdit}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] })}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] })}
      />

      <IndicatorEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        indicator={currentSelectedIndicator}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] })
        }}
      />
    </div>
  )
}
