'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/ui/typography'
import { Loader2, Zap, Rocket, AlertTriangle, Target, Clock, PieChart, CircleSlash, ShieldAlert, TrendingDown } from 'lucide-react'
import { ModalSkeleton } from '@/components/LazyLoader'

const AdoptionDetailsModal = lazy(() => import('./AdoptionDetailsModal').then(m => ({ default: m.AdoptionDetailsModal })))
import { Badge } from '@/components/ui/badge'

interface AdoptionRecord {
  id: string
  feature_id: string
  status: 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'
  action_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  action_plan: string | null
  blocker_category: string | null
  product_features: {
    name: string
    module: string
  }
}

export function AdoptionExecutiveSection({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [data, setData] = useState<AdoptionRecord[]>([])
  const [planSummary, setPlanSummary] = useState<{
    plan_name: string;
    risk_level: 'high' | 'low' | 'none';
    at_risk_features: string[];
  } | null>(null)
  const [apiContracts, setApiContracts] = useState<any[]>([])
  const [apiPlans, setApiPlans] = useState<any[]>([])
  const [apiPlanFeatures, setApiPlanFeatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdoption()
  }, [])

  async function fetchAdoption() {
    try {
      const res = await fetch(`/api/accounts/${accountId}/adoption`)
      if (res.ok) {
        const json = await res.json()
        setData(json.adoption || [])
        setPlanSummary(json.plan_summary)
        setApiContracts(json.contracts || [])
        setApiPlans(json.plans || [])
        setApiPlanFeatures(json.plan_features || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="h-40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-plannera-operations" />
      </Card>
    )
  }

  if (apiContracts.length === 0) {
    return (
      <Card className="relative overflow-hidden group">
        <CardContent className="p-6 space-y-6 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-plannera-operations/10 border border-plannera-operations/20">
              <Zap className="w-5 h-5 text-plannera-operations" />
            </div>
            <div className="space-y-0.5">
              <Text variant="primary" className="text-sm font-black uppercase tracking-widest leading-none select-none">Adoção Funcional</Text>
              <Text variant="secondary" className="!text-[9px] font-bold uppercase tracking-tight select-none">Utilização contratual do produto</Text>
            </div>
          </div>
          <div className="py-8 text-center border border-dashed border-border-divider rounded-2xl">
            <Text variant="secondary" className="!text-[10px] font-bold uppercase tracking-widest italic select-none">Nenhum plano configurado no contrato.</Text>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {apiContracts.map((contract) => {
        // 1. Encontrar o plano comercial do contrato
        const plan = apiPlans.find(p => p.name === contract.service_type)
        if (!plan) {
          // Se o contrato tem um plano que não está mapeado no banco,
          // mostra uma mensagem amigável
          return (
            <Card key={contract.id} className="relative overflow-hidden group">
              <CardContent className="p-6 space-y-6 relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-plannera-operations/10 border border-plannera-operations/20">
                      <Zap className="w-5 h-5 text-plannera-operations" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text variant="primary" className="text-sm font-black uppercase tracking-widest leading-none select-none">Adoção Funcional</Text>
                        <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tighter h-4 px-2">
                          Contrato: {contract.contract_code || contract.description || 'S/N'} | Plano: {contract.service_type || 'Nenhum'}
                        </Badge>
                      </div>
                      <Text variant="secondary" className="!text-[9px] font-bold uppercase tracking-tight select-none">Utilização contratual do produto</Text>
                    </div>
                  </div>
                </div>
                <div className="py-8 text-center border border-dashed border-border-divider rounded-2xl">
                  <Text variant="secondary" className="!text-[10px] font-bold uppercase tracking-widest italic select-none">Plano Custom ou Sem Funcionalidades Cadastradas.</Text>
                </div>
              </CardContent>
            </Card>
          )
        }

        // 2. Filtrar as plan_features para este plano
        const currentPlanFeatures = apiPlanFeatures.filter(pf => pf.plan_id === plan.id)
        const featureIds = new Set(currentPlanFeatures.map(pf => pf.feature_id))

        // 3. Filtrar registros de feature_adoption para este plano
        const planAdoptionRecords = data.filter(r => r.feature_id && featureIds.has(r.feature_id))

        const total = planAdoptionRecords.length
        const inUse = planAdoptionRecords.filter(r => r.status === 'in_use').length
        const partial = planAdoptionRecords.filter(r => r.status === 'partial').length
        const blocked = planAdoptionRecords.filter(r => r.status === 'blocked').length
        const notApplicable = planAdoptionRecords.filter(r => r.status === 'na').length

        // Apenas NA é excluído do potencial
        const totalExcluded = notApplicable
        const totalApplicable = total - totalExcluded

        const percentage = totalApplicable > 0
          ? Math.round(((inUse + (partial * 0.5)) / totalApplicable) * 100)
          : 0

        // Filtrar blockers para este contrato/plano
        const planBlockedRecords = planAdoptionRecords.filter(r => r.status === 'blocked')

        // Downgrade Risk especificamente se este plano estiver com risco
        const showDowngradeRisk = planSummary && planSummary.plan_name.includes(plan.name) && planSummary.risk_level !== 'none'

        return (
          <Card key={contract.id} className="relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-plannera-operations/5 blur-3xl rounded-full" />

            <CardContent className="p-6 space-y-6 relative">
              <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-plannera-operations/10 border border-plannera-operations/20">
                    <Zap className="w-5 h-5 text-plannera-operations" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text variant="primary" className="text-sm font-black uppercase tracking-widest leading-none select-none">Adoção Funcional</Text>
                      <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tighter h-4 px-2 whitespace-nowrap">
                        Contrato: {contract.contract_code || contract.description || 'S/N'} | Plano: {plan.name}
                      </Badge>
                    </div>
                    <Text variant="secondary" className="!text-[9px] font-bold uppercase tracking-tight select-none">Utilização contratual do produto</Text>
                  </div>
                </div>
                <Suspense fallback={<ModalSkeleton />}>
                  <AdoptionDetailsModal accountId={accountId} accountName={accountName} />
                </Suspense>
              </div>

              {total === 0 ? (
                <div className="py-8 text-center border border-dashed border-border-divider rounded-2xl">
                  <Text variant="secondary" className="!text-[10px] font-bold uppercase tracking-widest italic select-none">
                    Nenhum plano configurado no contrato.
                  </Text>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                    <div className="bg-surface-background p-2.5 rounded-2xl border border-border-divider flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-surface-card">
                      <Text variant="secondary" as="span" className="!text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                        <Target className="w-3 h-3 text-plannera-ds shrink-0" /> Total
                      </Text>
                      <Text variant="primary" className="text-2xl font-black leading-none">{total}</Text>
                    </div>

                    <div className="bg-surface-background p-2.5 rounded-2xl border border-border-divider flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-surface-card">
                      <Text as="span" className="text-emerald-500 !text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                        <Rocket className="w-3 h-3 shrink-0" /> Adotadas
                      </Text>
                      <Text variant="primary" className="text-2xl font-black leading-none">{inUse}</Text>
                    </div>

                    <div className="bg-surface-background p-2.5 rounded-2xl border border-border-divider flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-surface-card">
                      <Text variant="secondary" as="span" className="!text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                         <PieChart className="w-3 h-3 text-plannera-operations/60 shrink-0" /> Parcial
                      </Text>
                      <Text variant="primary" className="text-2xl font-black leading-none">{partial}</Text>
                    </div>

                    <div className="bg-surface-background p-2.5 rounded-2xl border border-border-divider flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-surface-card">
                      <Text as="span" className="text-destructive !text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 relative select-none">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> Bloqueio
                        {planBlockedRecords.some(r => r.action_plan) && (
                          <Clock className="w-2.5 h-2.5 text-warning animate-pulse absolute -right-3 -top-1" />
                        )}
                      </Text>
                      <Text variant="primary" className="text-2xl font-black leading-none">{blocked}</Text>
                    </div>

                    <div className="bg-surface-background p-2.5 rounded-2xl border border-border-divider flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-surface-card">
                      <Text variant="secondary" as="span" className="!text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 opacity-60 select-none">
                        <CircleSlash className="w-3 h-3 shrink-0" /> N/A
                      </Text>
                      <Text variant="primary" className="text-2xl font-black leading-none">{notApplicable}</Text>
                    </div>
                  </div>

                  {/* Downgrade Risk Panel */}
                  {showDowngradeRisk && planSummary && (
                    <div className={`p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-500 ${
                      planSummary.risk_level === 'high'
                        ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        : 'bg-warning/10 border-warning-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          planSummary.risk_level === 'high' ? 'bg-red-500/20' : 'bg-warning/20'
                        }`}>
                          {planSummary.risk_level === 'high'
                            ? <ShieldAlert className="w-5 h-5 text-red-500" />
                            : <TrendingDown className="w-5 h-5 text-warning" />
                          }
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <Text variant={planSummary.risk_level === 'high' ? 'destructive' : 'accent'} className="text-[11px] font-black uppercase tracking-widest select-none">
                              {planSummary.risk_level === 'high' ? 'Risco Crítico de Downgrade' : 'Atenção Commercial: Risco de Downgrade'}
                            </Text>
                            <Badge variant="outline" className={`text-[8px] border-none uppercase font-black ${
                              planSummary.risk_level === 'high' ? 'bg-red-500/20 text-red-200' : 'bg-warning/20 text-amber-200'
                            }`}>
                              Impacto Comercial: {planSummary.risk_level === 'high' ? 'Alto' : 'Médio'}
                            </Badge>
                          </div>
                          <Text variant="secondary" className="!text-[10px] leading-relaxed font-medium">
                            {planSummary.risk_level === 'high'
                              ? 'O cliente não está utilizando as funcionalidades que justificam o investimento no plano Professional/Essential. Risco imediato de redução de contrato.'
                              : 'Adoção parcial das funcionalidades exclusivas do plano atual. É necessário reforçar o valor estratégico para evitar questionamentos na renovação.'}
                          </Text>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {planSummary.at_risk_features.map((feat, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-surface-background px-2 py-1 rounded-lg border border-border-divider">
                                 <div className={`w-1 h-1 rounded-full ${planSummary.risk_level === 'high' ? 'bg-red-500' : 'bg-warning'}`} />
                                 <Text variant="primary" className="!text-[9px] font-black uppercase tracking-tight">{feat}</Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                        <Text variant="secondary" as="span" className="!text-[10px] font-black uppercase tracking-widest select-none">Score de Adoção Real</Text>
                        <div className="flex items-center gap-3">
                          <Text variant="secondary" as="span" className="font-black">{inUse}/{totalApplicable}</Text>
                          <Text as="span" className="text-plannera-operations font-black">{percentage}%</Text>
                        </div>
                      </div>
                      <div className="relative h-2.5 w-full bg-surface-background rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-plannera-operations to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {blocked > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <Text variant="destructive" as="span" className="!text-[9px] font-black uppercase tracking-tight select-none">
                            Principais Barreiras à Adoção Plena:
                          </Text>
                        </div>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                          {planBlockedRecords.map((r, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-red-500/20 pl-3 py-1">
                              <Text variant="primary" className="!text-[10px] font-black uppercase tracking-tight">{r.product_features.name}</Text>
                              <Text variant="secondary" className="!text-[8px] font-medium italic">
                                {r.action_plan || 'Nenhum plano de ação registrado'}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
