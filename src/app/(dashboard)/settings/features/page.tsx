'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/page-container'
import { SectionHeader } from '@/components/ui/section-header'
import { Loader2, Package, CheckCircle2, XCircle } from 'lucide-react'
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
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Package className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Configuração de Funcionalidades</h1>
        </div>
        <p className="label-premium">
          Estrutura Dinâmica de Módulos e Valor do Produto (Admin)
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeader
          title="Catálogo de Funcionalidades"
          subtitle="Unidades lógicas do sistema que compõem os planos"
          action={<FeatureDialog onSuccess={fetchFeatures} />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface-card border border-border-divider h-40 animate-pulse rounded-2xl" />
              ))
            ) : features.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-surface-card border border-border-divider rounded-2xl">
                <p className="text-content-secondary text-[10px] font-black uppercase tracking-widest opacity-30">Nenhuma funcionalidade cadastrada.</p>
              </div>
            ) : (
              features.map((feature, idx) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="shadow-xl hover:opacity-90 transition-all group overflow-hidden h-full">
                    <CardHeader className="pb-3 border-b border-border-divider">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Badge className="bg-plannera-orange/10 text-plannera-orange border-none text-[8px] font-bold uppercase tracking-widest">
                            {feature.module}
                          </Badge>
                          <CardTitle className="text-sm font-bold uppercase font-heading group-hover:text-primary transition-colors">
                            {feature.name}
                          </CardTitle>
                        </div>
                        <FeatureDialog feature={feature} onSuccess={fetchFeatures} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="label-premium !text-[10px] opacity-60 min-h-[40px]">
                        {feature.description || 'Nenhuma descrição técnica informada.'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-border-divider">
                        <div className="flex items-center gap-1.5">
                          {feature.is_active ? (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase">Ativa</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-content-secondary">
                              <XCircle className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase">Inativa</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-content-secondary">ID: {feature.id.split('-')[0].toUpperCase()}</span>
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
