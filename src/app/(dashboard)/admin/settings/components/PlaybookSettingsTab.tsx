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
  auto_trigger_enabled: true,
  require_assignment: true,
  adoption_low_threshold: 30,
  adoption_trigger_days: 14,
  onboarding_duration_days: 30,
  max_concurrent_playbooks: 3,
  effectiveness_min_samples: 5,
}

export function PlaybookSettingsTab() {
  const [values, setValues] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof DEFAULT, val: number | boolean) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'playbooks', settings: values }),
      })
      toast.success('Configurações de playbooks salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ k, label, description }: { k: keyof typeof DEFAULT; label: string; description?: string }) => (
    <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
      <div>
        <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}</Label>
        {description && <p className="text-[10px] text-content-secondary/60 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => set(k, !values[k])}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${values[k] ? 'bg-plannera-orange' : 'bg-border-divider'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${values[k] ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      <SectionHeader title="Playbooks & Automação CS" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Regras de Disparo</h3>
          <Toggle k="auto_trigger_enabled" label="Auto-trigger por health score" description="Dispara playbook quando health cai abaixo do limiar" />
          <Toggle k="require_assignment" label="Exigir atribuição de responsável" description="Task de playbook deve ter owner definido" />

          <div className="space-y-1.5 pt-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Playbooks simultâneos por conta (máx.)</Label>
            <Input type="number" min={1} max={10} value={values.max_concurrent_playbooks}
              onChange={e => set('max_concurrent_playbooks', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Parâmetros de Adoção</h3>

          {[
            { key: 'adoption_low_threshold', label: 'Adoção baixa abaixo de (%)', min: 10, max: 70 },
            { key: 'adoption_trigger_days', label: 'Dias sem melhora para trigger', min: 7, max: 60 },
            { key: 'onboarding_duration_days', label: 'Duração padrão de onboarding (dias)', min: 14, max: 90 },
            { key: 'effectiveness_min_samples', label: 'Mín. de execuções para medir eficácia', min: 2, max: 20 },
          ].map(({ key, label, min, max }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}</Label>
              <Input type="number" min={min} max={max} value={Number(values[key as keyof typeof DEFAULT])}
                onChange={e => set(key as keyof typeof DEFAULT, Number(e.target.value))}
                className="bg-surface-background/50 border-border-divider rounded-xl" />
            </div>
          ))}
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
