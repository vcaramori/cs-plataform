'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/page-container'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, Layers, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlanDialog } from '../../product/components/PlanDialog'
import { Badge } from '@/components/ui/badge'

interface Feature {
  id: string
  name: string
  module: string
  is_active: boolean
}

interface Plan {
  id: string
  name: string
  description: string | null
  is_active: boolean
  plan_features: {
    feature_id: string
    product_features: Feature
  }[]
}

export default function PlansSettingsPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    try {
      const res = await fetch('/api/product/plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Configuração de Planos</h1>
        </div>
        <p className="label-premium">
          Estrutura de Ofertas e Composições Contratuais (Admin)
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeader
          title="Estrutura de Planos"
          subtitle="Composição de ofertas para o mercado"
          action={<PlanDialog onSuccess={fetchPlans} />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface-card border border-border-divider h-60 animate-pulse rounded-2xl" />
              ))
            ) : plans.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-surface-card border border-border-divider rounded-2xl">
                <p className="text-content-secondary text-[10px] font-black uppercase tracking-widest opacity-30">Nenhum plano cadastrado.</p>
              </div>
            ) : (
              plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="shadow-xl hover:opacity-90 transition-all group overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-4 border-b border-plannera-sop/10 bg-plannera-sop/[0.02]">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-md font-bold uppercase font-heading group-hover:text-primary transition-colors">
                          {plan.name}
                        </CardTitle>
                        <PlanDialog plan={plan} onSuccess={fetchPlans} />
                      </div>
                      <p className="text-content-secondary text-[10px] font-medium uppercase tracking-tight mt-1">
                        {plan.description || 'Sem descrição comercial.'}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="label-premium">Funcionalidades Inclusas</span>
                          <Badge className="bg-plannera-sop/20 text-plannera-sop border-none text-[9px] font-bold">
                            {plan.plan_features?.length || 0} Itens
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                          {plan.plan_features?.map((pf) => (
                            <div key={pf.feature_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-background border border-border-divider">
                              <ChevronRight className="w-3 h-3 text-plannera-sop" />
                              <span className="text-content-primary text-[10px] font-bold uppercase tracking-tight truncate">{pf.product_features?.name}</span>
                            </div>
                          ))}
                          {!plan.plan_features?.length && (
                            <p className="text-content-secondary text-[9px] font-bold uppercase italic text-center py-4">Vazio</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-border-divider">
                        <div className="flex items-center gap-1.5">
                          {plan.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase">Ativo</Badge>
                          ) : (
                            <Badge className="bg-content-secondary/10 text-content-secondary border-none text-[8px] font-black uppercase">Inativo</Badge>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-content-secondary">PLAN_ID: {plan.id.split('-')[0].toUpperCase()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageContainer>
  )
}
