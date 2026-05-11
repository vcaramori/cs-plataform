'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const DEFAULT = {
  silence_days_tier1: 7,
  silence_days_tier2: 14,
  silence_days_tier3: 30,
  health_critical_threshold: 40,
  health_trigger_playbook: 50,
  churn_risk_threshold: 40,
  checkin_approval_window_hours: 4,
  nps_detractor_followup_days: 3,
  anomaly_zscore_threshold: 2.5,
  adoption_cliff_percent: 20,
}

export function AlertSettingsTab() {
  const [values, setValues] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof DEFAULT, val: number) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'alerts', settings: values }),
      })
      toast.success('Configurações de alertas salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ k, label, min, max, unit = '' }: { k: keyof typeof DEFAULT; label: string; min: number; max: number; unit?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}{unit && ` (${unit})`}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={Number(values[k])}
        onChange={e => set(k, Number(e.target.value))}
        className="bg-surface-background/50 border-border-divider rounded-xl"
      />
    </div>
  )

  return (
    <div className="space-y-8">
      <SectionHeader title="Alertas & Automações" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Silêncio de Conta (dias)</h3>
          <Field k="silence_days_tier1" label="Tier 1 (Estratégico)" min={3} max={30} unit="dias" />
          <Field k="silence_days_tier2" label="Tier 2 (Enterprise)" min={5} max={60} unit="dias" />
          <Field k="silence_days_tier3" label="Tier 3 (Mid-market)" min={7} max={90} unit="dias" />
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Limiares de Health</h3>
          <Field k="health_critical_threshold" label="Health Crítico abaixo de" min={10} max={60} unit="%" />
          <Field k="health_trigger_playbook" label="Trigger Playbook abaixo de" min={20} max={80} unit="%" />
          <Field k="churn_risk_threshold" label="Risco de Churn abaixo de" min={10} max={70} unit="%" />
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Parâmetros Avançados</h3>
          <Field k="checkin_approval_window_hours" label="Janela de aprovação check-in" min={1} max={48} unit="horas" />
          <Field k="nps_detractor_followup_days" label="Follow-up detrator em" min={1} max={14} unit="dias" />
          <Field k="anomaly_zscore_threshold" label="Z-score para anomalia" min={1} max={5} />
          <Field k="adoption_cliff_percent" label="Queda de adoção (cliff)" min={5} max={50} unit="%" />
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-border-divider">
        <Button onClick={handleSave} disabled={saving} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
