'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-container'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  ShieldCheck,
  Loader2,
  Save,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const INTERNAL_LEVEL_LABELS = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo'
}

const INTERNAL_LEVEL_COLORS = {
  critical: 'text-red-400',
  high: 'text-plannera-orange',
  medium: 'text-amber-400',
  low: 'text-emerald-400'
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

export default function SLASettingsPage() {
  const [policy, setPolicy] = useState<SLAPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPolicy()
  }, [])

  async function fetchPolicy() {
    try {
      const res = await fetch('/api/settings/sla')
      if (res.ok) {
        const data = await res.json()
        setPolicy(data)
      }
    } catch (e) {
      toast.error('Erro ao carregar política de SLA')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/sla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      })
      if (res.ok) {
        toast.success('Configurações salvas com sucesso')
      } else {
        throw new Error()
      }
    } catch (e) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
      </div>
    )
  }

  if (!policy) return null

  return (
    <PageContainer className="max-w-[1200px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Política de SLA Padrão</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Níveis e Prazos Globais para Atendimento de Suporte
          <Sparkles className="w-3.5 h-3.5 text-content-secondary/40" />
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-[3px] bg-indigo-500/50" />
            <CardHeader className="px-8 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="h2-section flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Prazos por Criticidade
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-4">
              <div className="overflow-hidden rounded-xl border border-border-divider">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-background">
                      <th className="p-4 text-[10px] font-black text-content-secondary uppercase tracking-widest pl-8">Nível Interno</th>
                      <th className="p-4 text-[10px] font-black text-content-secondary uppercase tracking-widest text-center">1ª Resposta (Min)</th>
                      <th className="p-4 text-[10px] font-black text-content-secondary uppercase tracking-widest text-center pr-8">Resolução (Min)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-divider">
                    {policy.levels.sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 }
                      return order[a.level] - order[b.level]
                    }).map((level) => (
                      <tr key={level.level} className="hover:bg-surface-background/60 transition-colors">
                        <td className="p-4 pl-8">
                          <span className={cn("text-xs font-black uppercase tracking-wider", INTERNAL_LEVEL_COLORS[level.level])}>
                            {INTERNAL_LEVEL_LABELS[level.level]}
                          </span>
                        </td>
                        <td className="p-4">
                          <Input
                            type="number"
                            value={level.first_response_minutes}
                            onChange={(e) => {
                              const newLevels = [...policy.levels]
                              newLevels[policy.levels.findIndex(l => l.level === level.level)].first_response_minutes = parseInt(e.target.value) || 0
                              setPolicy({ ...policy, levels: newLevels })
                            }}
                            className="w-24 mx-auto h-9 text-center text-xs font-mono"
                          />
                        </td>
                        <td className="p-4 pr-8">
                          <Input
                            type="number"
                            value={level.resolution_minutes}
                            onChange={(e) => {
                              const newLevels = [...policy.levels]
                              newLevels[policy.levels.findIndex(l => l.level === level.level)].resolution_minutes = parseInt(e.target.value) || 0
                              setPolicy({ ...policy, levels: newLevels })
                            }}
                            className="w-24 mx-auto h-9 text-center text-xs font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-500/70 font-medium leading-relaxed uppercase">
                  Atenção: Mudanças nos tempos globais não retroagirão para chamados que já estão abertos. O novo SLA será aplicado apenas para novos chamados em clientes que utilizam o padrão Plannera.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-[3px] bg-sky-500/50" />
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="h2-section flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Engenharia de Alerta
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-6 pt-2">
              <div className="space-y-2">
                <Label className="label-premium ml-1">Alerta de Proximidade (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={policy.alert_threshold_pct}
                    onChange={(e) => setPolicy({ ...policy, alert_threshold_pct: parseInt(e.target.value) || 0 })}
                    className="h-10 text-xs font-mono"
                  />
                  <span className="text-content-secondary text-xs font-bold">%</span>
                </div>
                <p className="text-[9px] text-content-secondary italic">Disparar alerta visual quando restar X% do tempo total.</p>
              </div>

              <div className="space-y-2">
                <Label className="label-premium ml-1">Fechamento Automático (H)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={policy.auto_close_hours}
                    onChange={(e) => setPolicy({ ...policy, auto_close_hours: parseInt(e.target.value) || 0 })}
                    className="h-10 text-xs font-mono"
                  />
                  <span className="text-content-secondary text-xs font-bold">HRS</span>
                </div>
                <p className="text-[9px] text-content-secondary italic">Tempo após resolução para fechar o ticket automaticamente sem interação.</p>
              </div>

              <div className="space-y-2">
                <Label className="label-premium ml-1">Fuso Horário Base</Label>
                <SearchableSelect
                  value={policy.timezone}
                  onValueChange={(v) => setPolicy({ ...policy, timezone: v })}
                  options={[
                    { label: 'Brasília (GMT-3)', value: 'America/Sao_Paulo' },
                    { label: 'London (UTC)', value: 'UTC' }
                  ]}
                  className="h-10 text-xs"
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 gap-2"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar SLA Global
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-content-primary text-xs font-bold uppercase tracking-wider">Modo Plannera</h4>
                <p className="label-premium !text-[9px] opacity-60">Consistência e Excelência</p>
              </div>
            </div>
            <p className="text-content-secondary text-[10px] leading-relaxed">
              Este SLA garante que o suporte da Plannera mantenha o mesmo padrão de qualidade para todos os clientes que não possuem contratos customizados. Ele é o coração do monitoramento operacional.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
