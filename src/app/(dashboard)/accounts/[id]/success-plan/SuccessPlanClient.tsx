'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Target, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { toast } from 'sonner'
import { IndicatorCard } from '../components/IndicatorCard'
import { IndicatorDetailsModal } from '../components/IndicatorDetailsModal'
import { IndicatorEditModal } from '../components/IndicatorEditModal'
import { AddIndicatorModal } from '../components/AddIndicatorModal'

export function SuccessPlanClient() {
  const params = useParams()
  const accountId = params.id as string
  const queryClient = useQueryClient()

  const [isAddIndicatorOpen, setIsAddIndicatorOpen] = useState(false)
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { data: accountData } = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}`)
      if (!res.ok) return { name: 'Cliente' }
      return res.json()
    }
  })

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
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-plannera-orange" /></div>
  }

  if (error) {
    return <div className="p-6"><p className="text-destructive">Erro ao carregar indicadores do cliente.</p></div>
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <Link href={`/accounts/${accountId}`} className="shrink-0 mt-1">
            <Button className="w-12 h-12 rounded-2xl bg-plannera-orange hover:bg-plannera-orange/90 text-white shadow-xl flex items-center justify-center group p-0">
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>
          <ModuleHeader title="Indicadores" subtitle={`Plano de Sucesso para ${accountData?.name || 'Cliente'}`} iconName="Target" className="mb-0" />
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <Button onClick={() => setIsAddIndicatorOpen(true)} className="gap-2 bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-2xl shadow-xl">
            <Plus className="w-4 h-4" />
            Novo Indicador
          </Button>
        </div>
      </div>

      {indicators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-divider rounded-3xl bg-surface-background/50">
          <Target className="w-12 h-12 text-content-secondary/40 mb-4" />
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Nenhum Indicador</h3>
          <p className="text-sm text-content-secondary max-w-sm mt-2 font-medium">Voce ainda nao cadastrou indicadores para este cliente. Clique no botao acima para adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {indicators.map((indicator, idx) => (
            <IndicatorCard key={indicator.id} index={idx} indicator={indicator} history={indicator.history || []} onClick={() => handleOpenDetails(indicator)} />
          ))}
        </div>
      )}

      <AddIndicatorModal isOpen={isAddIndicatorOpen} onClose={() => setIsAddIndicatorOpen(false)} accountId={accountId} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] }) }} />
      <IndicatorDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} indicator={currentSelectedIndicator} history={currentSelectedIndicator?.history || []} accountName={accountData?.name || 'Cliente'} onAddDataPoint={handleOpenEdit} />
      <IndicatorEditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} indicator={currentSelectedIndicator} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['account-indicators', accountId] }) }} />
    </PageContainer>
  )
}
