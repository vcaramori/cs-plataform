'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Target } from 'lucide-react'
import { toast } from 'sonner'
import { IndicatorCard } from '../components/IndicatorCard'
import { IndicatorDetailsModal } from '../components/IndicatorDetailsModal'
import { IndicatorEditModal } from '../components/IndicatorEditModal'
import { AddIndicatorModal } from '../components/AddIndicatorModal'

export default function SuccessPlanPage() {
  const params = useParams()
  const accountId = params.id as string
  const queryClient = useQueryClient()

  const [isAddIndicatorOpen, setIsAddIndicatorOpen] = useState(false)
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Fetch account basics just to get the name for the modal
  const { data: accountData } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}`)
      if (!res.ok) return { name: 'Cliente' }
      return res.json()
    }
  })
  
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

  // Derived selected indicator to keep modal updated after edit
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Erro ao carregar indicadores do cliente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-plannera-orange/10 text-plannera-orange border border-plannera-orange/20 shadow-sm">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter uppercase leading-none">
              Indicadores
            </h1>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-content-secondary mt-1">
              Plano de Sucesso
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsAddIndicatorOpen(true)}
          className="gap-2 bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-[10px] h-10 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Novo Indicador
        </Button>
      </div>

      {/* Grid de Indicadores */}
      {indicators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-divider rounded-3xl bg-surface-background/50">
          <Target className="w-12 h-12 text-content-secondary/40 mb-4" />
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Nenhum Indicador</h3>
          <p className="text-sm text-content-secondary max-w-sm mt-2 font-medium">
            Você ainda não cadastrou indicadores para este cliente. Clique no botão acima para adicionar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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

      {/* Modais */}
      <AddIndicatorModal
        isOpen={isAddIndicatorOpen}
        onClose={() => setIsAddIndicatorOpen(false)}
        accountId={accountId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] })
        }}
      />

      <IndicatorDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        indicator={currentSelectedIndicator}
        history={currentSelectedIndicator?.history || []}
        accountName={accountData?.name || 'Cliente'}
        onAddDataPoint={handleOpenEdit}
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
