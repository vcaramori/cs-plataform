'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Sparkles, CheckCircle2, XCircle, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FeatureDialog } from '../../product/components/FeatureDialog'
import { Badge } from '@/components/ui/badge'

interface Feature {
  id: string
  name: string
  module: string
  description: string | null
  is_active: boolean
}

export default function FeaturesSettingsPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeatures()
  }, [])

  async function fetchFeatures() {
    setLoading(true)
    try {
      const res = await fetch('/api/product/features')
      if (res.ok) {
        const data = await res.json()
        setFeatures(data)
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
          <div className="p-2 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20">
            <Sparkles className="w-7 h-7 text-plannera-orange" />
          </div>
          Configuração de Funcionalidades <span className="text-plannera-orange/40 ml-2">(Admin)</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-14 opacity-70">Estrutura Dinâmica de Módulos e Valor do Produto</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-white text-sm font-bold uppercase tracking-widest">Catálogo de Funcionalidades</h2>
            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tight">Unidades lógicas do sistema que compõem os planos</p>
          </div>
          <FeatureDialog onSuccess={fetchFeatures} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card h-40 animate-pulse rounded-2xl" />
              ))
            ) : features.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card rounded-2xl">
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-30">Nenhuma funcionalidade cadastrada.</p>
              </div>
            ) : (
              features.map((feature, idx) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-card border-none shadow-xl hover:bg-white/[0.03] transition-all group overflow-hidden h-full">
                    <CardHeader className="pb-3 border-b border-white/5 bg-white/[0.01]">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Badge className="bg-plannera-orange/10 text-plannera-orange border-none text-[8px] font-bold uppercase tracking-widest">
                            {feature.module}
                          </Badge>
                          <CardTitle className="text-white text-sm font-bold uppercase font-heading group-hover:text-plannera-orange transition-colors">
                            {feature.name}
                          </CardTitle>
                        </div>
                        <FeatureDialog feature={feature} onSuccess={fetchFeatures} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-slate-500 text-[10px] font-medium leading-relaxed uppercase tracking-tight min-h-[40px]">
                        {feature.description || 'Nenhuma descrição técnica informada.'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {feature.is_active ? (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase">Ativa</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <XCircle className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase">Inativa</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-700">ID: {feature.id.split('-')[0].toUpperCase()}</span>
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
