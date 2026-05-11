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
  auto_close_hours: 72,
  similarity_threshold: 0.85,
  ticket_capacity_per_csm: 50,
  breach_alert_threshold: 80,
  escalation_after_hours: 24,
  auto_assign_enabled: true,
}

export function SLASettingsTab() {
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
        body: JSON.stringify({ module: 'sla', settings: values }),
      })
      toast.success('Configurações de SLA salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader title="Parâmetros de SLA & Suporte" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-4">Automação de Tickets</h3>

          {[
            { key: 'auto_close_hours', label: 'Auto-close após (horas sem resposta)', min: 24, max: 720 },
            { key: 'ticket_capacity_per_csm', label: 'Capacidade máx. por CSM (tickets ativos)', min: 10, max: 200 },
            { key: 'escalation_after_hours', label: 'Escalonar após (horas sem atualização)', min: 1, max: 168 },
          ].map(({ key, label, min, max }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}</Label>
              <Input
                type="number"
                min={min}
                max={max}
                value={Number(values[key as keyof typeof DEFAULT])}
                onChange={e => set(key as keyof typeof DEFAULT, Number(e.target.value))}
                className="bg-surface-background/50 border-border-divider rounded-xl"
              />
            </div>
          ))}

          <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Auto-assign habilitado</Label>
            <button
              onClick={() => set('auto_assign_enabled', !values.auto_assign_enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${values.auto_assign_enabled ? 'bg-plannera-orange' : 'bg-border-divider'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${values.auto_assign_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-4">Alertas de SLA</h3>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Alerta de breach ao atingir (%)</Label>
              <span className="text-[10px] font-black">{values.breach_alert_threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={values.breach_alert_threshold}
              onChange={e => set('breach_alert_threshold', Number(e.target.value))}
              className="w-full accent-plannera-orange"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Similaridade mín. para duplicata (%)</Label>
              <span className="text-[10px] font-black">{Math.round(values.similarity_threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={99}
              value={Math.round(values.similarity_threshold * 100)}
              onChange={e => set('similarity_threshold', Number(e.target.value) / 100)}
              className="w-full accent-plannera-orange"
            />
          </div>
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
