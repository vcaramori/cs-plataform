'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Layers, CheckCircle2, ChevronRight } from 'lucide-react'
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
    <div className="p-8 max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-extrabold text-white flex items-center gap-3 uppercase tracking-tight">
          <div className="p-2 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20">
            <Layers className="w-7 h-7 text-plannera-sop" />
          </div>
          Configuração de Planos <span className="text-plannera-sop/40 ml-2">(Admin)</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-14 opacity-70">Estrutura de Ofertas e Composições Contratuais</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-white text-sm font-bold uppercase tracking-widest">Estrutura de Planos</h2>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tight">Composição de ofertas para o mercado</p>
          </div>
          <PlanDialog onSuccess={fetchPlans} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card h-60 animate-pulse rounded-2xl" />
              ))
            ) : plans.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card rounded-2xl">
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-30">Nenhum plano cadastrado.</p>
              </div>
            ) : (
              plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-card border-none shadow-xl hover:bg-white/[0.03] transition-all group overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-4 border-b border-plannera-sop/10 bg-plannera-sop/[0.02]">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-md font-bold uppercase font-heading group-hover:text-plannera-sop transition-colors">
                          {plan.name}
                        </CardTitle>
                        <PlanDialog plan={plan} onSuccess={fetchPlans} />
                      </div>
                      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tight mt-1">
                        {plan.description || 'Sem descrição comercial.'}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Funcionalidades Inclusas</span>
                           <Badge className="bg-plannera-sop/20 text-plannera-sop border-none text-[9px] font-bold">
                             {plan.plan_features?.length || 0} Itens
                           </Badge>
                        </div>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                          {plan.plan_features?.map((pf) => (
                            <div key={pf.feature_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                              <ChevronRight className="w-3 h-3 text-plannera-sop" />
                              <span className="text-white text-[10px] font-bold uppercase tracking-tight truncate">{pf.product_features?.name}</span>
                            </div>
                          ))}
                          {!plan.plan_features?.length && (
                            <p className="text-slate-700 text-[9px] font-bold uppercase italic text-center py-4">Vazio</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                         <div className="flex items-center gap-1.5">
                          {plan.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase">Ativo</Badge>
                          ) : (
                            <Badge className="bg-slate-500/10 text-slate-500 border-none text-[8px] font-black uppercase">Inativo</Badge>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-700">PLAN_ID: {plan.id.split('-')[0].toUpperCase()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
