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
  promoter_threshold: 9,
  detractor_threshold: 6,
  min_responses_for_score: 3,
  days_between_surveys: 90,
  follow_up_detractor_days: 7,
  include_comment: true,
  include_effort_score: false,
  include_product_score: false,
}

export function NPSSettingsTab() {
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
        body: JSON.stringify({ module: 'nps', settings: values }),
      })
      toast.success('Configurações de NPS salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ k, label }: { k: keyof typeof DEFAULT; label: string }) => (
    <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">{label}</Label>
      <button
        onClick={() => set(k, !values[k])}
        className={`relative w-10 h-5 rounded-full transition-colors ${values[k] ? 'bg-plannera-orange' : 'bg-border-divider'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${values[k] ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )

  return (
    <div className="space-y-8">
      <SectionHeader title="Parâmetros de NPS & Pesquisas" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-4">Classificação de Respostas</h3>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Promotor (nota ≥)</Label>
              <span className="text-[10px] font-black text-emerald-600">{values.promoter_threshold}</span>
            </div>
            <input type="range" min={8} max={10} value={values.promoter_threshold}
              onChange={e => set('promoter_threshold', Number(e.target.value))}
              className="w-full accent-emerald-500" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Detrator (nota ≤)</Label>
              <span className="text-[10px] font-black text-red-600">{values.detractor_threshold}</span>
            </div>
            <input type="range" min={1} max={7} value={values.detractor_threshold}
              onChange={e => set('detractor_threshold', Number(e.target.value))}
              className="w-full accent-red-500" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Respostas mínimas para calcular NPS</Label>
            <Input type="number" min={1} max={20} value={values.min_responses_for_score}
              onChange={e => set('min_responses_for_score', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-4">Frequência & Follow-up</h3>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Intervalo mínimo entre pesquisas (dias)</Label>
            <Input type="number" min={30} max={365} value={values.days_between_surveys}
              onChange={e => set('days_between_surveys', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Follow-up de detratores após (dias)</Label>
            <Input type="number" min={1} max={30} value={values.follow_up_detractor_days}
              onChange={e => set('follow_up_detractor_days', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Campos adicionais nas pesquisas</p>
            <Toggle k="include_comment" label="Campo de comentário" />
            <Toggle k="include_effort_score" label="Customer Effort Score (CES)" />
            <Toggle k="include_product_score" label="Nota de Produto" />
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
