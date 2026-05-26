'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-container'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, Save, Clock, Zap, Target, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'

const INTERNAL_LEVEL_LABELS: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Baixo',
}

const INTERNAL_LEVEL_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-plannera-orange',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

interface SLALevel {
  level: 'critical' | 'high' | 'medium' | 'low'
  first_response_minutes: number
  resolution_minutes: number
}

interface SLAPolicy {
  id: string
  alert_threshold_pct: number
  auto_close_hours: number
  timezone: string
  levels: SLALevel[]
}

export function SLASettingsClient() {
  const [policy, setPolicy] = useState<SLAPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPolicy() }, [])

  async function fetchPolicy() {
    try {
      const res = await fetch('/api/settings/sla')
      if (res.ok) setPolicy(await res.json())
    } catch { toast.error('Erro ao carregar politica de SLA') }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/sla', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policy) })
      if (res.ok) toast.success('Configuracoes salvas com sucesso')
      else throw new Error()
    } catch { toast.error('Erro ao salvar configuracoes') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-plannera-orange" /></div>
  if (!policy) return null

  return (
    <PageContainer className="max-w-[960px] space-y-6">
      <ModuleHeader title="Politica de SLA Padrao" subtitle="Niveis e Prazos Globais para Atendimento de Suporte" iconName="ShieldCheck" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="h-[2px] bg-indigo-500/50" />
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="h2-section flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Prazos por Criticidade</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-2">
              <div className="overflow-hidden rounded-xl border border-border-divider">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-background">
                      <th className="p-3 pl-5 text-[10px] font-extrabold text-content-secondary uppercase tracking-widest">Nivel</th>
                      <th className="p-3 text-[10px] font-extrabold text-content-secondary uppercase tracking-widest text-center">1a Resposta (Min)</th>
                      <th className="p-3 text-[10px] font-extrabold text-content-secondary uppercase tracking-widest text-center pr-5">Resolucao (Min)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-divider">
                    {policy.levels.sort((a, b) => {
                      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
                      return order[a.level] - order[b.level]
                    }).map((level) => (
                      <tr key={level.level} className="hover:bg-surface-background/60 transition-colors">
                        <td className="p-3 pl-5">
                          <span className={cn('text-xs font-extrabold uppercase tracking-wider', INTERNAL_LEVEL_COLORS[level.level])}>{INTERNAL_LEVEL_LABELS[level.level]}</span>
                        </td>
                        <td className="p-2">
                          <Input type="number" value={level.first_response_minutes} onChange={(e) => {
                            const newLevels = [...policy.levels]
                            newLevels[policy.levels.findIndex(l => l.level === level.level)].first_response_minutes = parseInt(e.target.value) || 0
                            setPolicy({ ...policy, levels: newLevels })
                          }} className="w-24 mx-auto h-8 text-center text-xs font-mono" />
                        </td>
                        <td className="p-2 pr-5">
                          <Input type="number" value={level.resolution_minutes} onChange={(e) => {
                            const newLevels = [...policy.levels]
                            newLevels[policy.levels.findIndex(l => l.level === level.level)].resolution_minutes = parseInt(e.target.value) || 0
                            setPolicy({ ...policy, levels: newLevels })
                          }} className="w-24 mx-auto h-8 text-center text-xs font-mono" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-warning/5 border border-warning-500/10 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-[10px] text-warning/70 font-medium leading-relaxed uppercase">Mudancas nos tempos globais nao retroagem para chamados abertos. O novo SLA e aplicado apenas para novos chamados.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="h-[2px] bg-sky-500/50" />
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="h2-section flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Engenharia de Alerta</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="label-premium ml-1">Alerta de Proximidade (%)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={policy.alert_threshold_pct} onChange={(e) => setPolicy({ ...policy, alert_threshold_pct: parseInt(e.target.value) || 0 })} className="h-9 text-xs font-mono" />
                  <span className="text-content-secondary text-xs font-bold shrink-0">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-premium ml-1">Fechamento Automatico (H)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={policy.auto_close_hours} onChange={(e) => setPolicy({ ...policy, auto_close_hours: parseInt(e.target.value) || 0 })} className="h-9 text-xs font-mono" />
                  <span className="text-content-secondary text-xs font-bold shrink-0">HRS</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-premium ml-1">Fuso Horario Base</Label>
                <SearchableSelect value={policy.timezone} onValueChange={(v) => setPolicy({ ...policy, timezone: v })} options={[{ label: 'Brasilia (GMT-3)', value: 'America/Sao_Paulo' }, { label: 'London (UTC)', value: 'UTC' }]} className="h-9 text-xs" />
              </div>
              <Button onClick={handleSave} className="w-full h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm gap-2 text-[10px]" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Salvar SLA Global</>}
              </Button>
            </CardContent>
          </Card>

          <Card className="p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10 border border-success-500/20"><Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <h4 className="text-content-primary text-[10px] font-bold uppercase tracking-wider">Modo Plannera</h4>
                <p className="label-premium !text-[9px] opacity-60">Consistencia e Excelencia</p>
              </div>
            </div>
            <p className="text-content-secondary text-[10px] leading-relaxed">Este SLA garante que o suporte da Plannera mantenha o mesmo padrao de qualidade para todos os clientes sem contratos customizados.</p>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
