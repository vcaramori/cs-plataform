'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Activity } from 'lucide-react'

const DEFAULT = {
  weight_sla: 25,
  weight_nps: 25,
  weight_adoption: 25,
  weight_relationship: 25,
  threshold_critical: 40,
  threshold_at_risk: 60,
  threshold_healthy: 80,
  recalc_cron: '0 2 * * *',
}

export function HealthSettingsTab() {
  const [values, setValues] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const totalWeight = values.weight_sla + values.weight_nps + values.weight_adoption + values.weight_relationship

  function set(key: keyof typeof DEFAULT, val: number | string) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'health', settings: values }),
      })
      toast.success('Configurações de health score salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleRecalc() {
    setRecalculating(true)
    try {
      await fetch('/api/cron/health-recalc', { method: 'POST' })
      toast.success('Recálculo iniciado — pode levar alguns minutos')
    } catch {
      toast.error('Erro ao iniciar recálculo')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader title="Dimensões & Pesos" subtitle="Soma deve ser 100%" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-plannera-orange" />
            <h3 className="font-bold text-content-primary text-sm">Pesos das Dimensões</h3>
            <span className={`ml-auto text-xs font-black ${totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalWeight}/100
            </span>
          </div>

          {[
            { key: 'weight_sla', label: 'SLA & Suporte' },
            { key: 'weight_nps', label: 'NPS & Satisfação' },
            { key: 'weight_adoption', label: 'Adoção de Produto' },
            { key: 'weight_relationship', label: 'Relacionamento' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}</Label>
                <span className="text-[10px] font-black text-content-primary">{values[key as keyof typeof DEFAULT]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Number(values[key as keyof typeof DEFAULT])}
                onChange={e => set(key as keyof typeof DEFAULT, Number(e.target.value))}
                className="w-full accent-plannera-orange"
              />
            </div>
          ))}
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-4">Limiares de Classificação</h3>

          {[
            { key: 'threshold_critical', label: 'Crítico (abaixo de)', color: 'text-red-600' },
            { key: 'threshold_at_risk', label: 'Em Risco (abaixo de)', color: 'text-amber-600' },
            { key: 'threshold_healthy', label: 'Saudável (acima de)', color: 'text-emerald-600' },
          ].map(({ key, label, color }) => (
            <div key={key} className="space-y-1.5">
              <Label className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number(values[key as keyof typeof DEFAULT])}
                onChange={e => set(key as keyof typeof DEFAULT, Number(e.target.value))}
                className="bg-surface-background/50 border-border-divider rounded-xl"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Cron de Recálculo</Label>
            <Input
              value={String(values.recalc_cron)}
              onChange={e => set('recalc_cron', e.target.value)}
              placeholder="0 2 * * *"
              className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs"
            />
            <p className="text-[10px] text-content-secondary">Formato cron (UTC). Padrão: 2h da manhã diariamente</p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border-divider">
        <Button
          variant="outline"
          onClick={handleRecalc}
          disabled={recalculating}
          className="gap-2"
        >
          {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recalcular Agora
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || totalWeight !== 100}
          className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
