'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'

const DEFAULT = {
  password_min_length: 8,
  require_special_chars: true,
  require_numbers: true,
  session_timeout_hours: 24,
  mfa_required: false,
  allowed_domains: '',
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
}

export function SecuritySettingsTab() {
  const [values, setValues] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof DEFAULT, val: string | number | boolean) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'security', settings: values }),
      })
      toast.success('Configurações de segurança salvas')
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
      <SectionHeader title="Políticas de Segurança & Acesso" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-content-primary text-sm">Política de Senhas</h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Comprimento mínimo</Label>
              <span className="text-[10px] font-black">{values.password_min_length} chars</span>
            </div>
            <input type="range" min={6} max={32} value={values.password_min_length}
              onChange={e => set('password_min_length', Number(e.target.value))}
              className="w-full accent-blue-500" />
          </div>

          <Toggle k="require_special_chars" label="Exigir caracteres especiais" />
          <Toggle k="require_numbers" label="Exigir números" />
          <Toggle k="mfa_required" label="MFA obrigatório para todos" />
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-content-primary text-sm mb-2">Sessão & Acesso</h3>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Timeout de sessão (horas)</Label>
            <Input type="number" min={1} max={168} value={values.session_timeout_hours}
              onChange={e => set('session_timeout_hours', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Tentativas máximas de login</Label>
            <Input type="number" min={3} max={20} value={values.max_login_attempts}
              onChange={e => set('max_login_attempts', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Bloqueio após falhas (minutos)</Label>
            <Input type="number" min={5} max={1440} value={values.lockout_duration_minutes}
              onChange={e => set('lockout_duration_minutes', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Domínios permitidos (um por linha)</Label>
            <Textarea
              value={values.allowed_domains}
              onChange={e => set('allowed_domains', e.target.value)}
              placeholder="plannera.com.br&#10;antigravity.com.br"
              rows={3}
              className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs"
            />
            <p className="text-[10px] text-content-secondary">Vazio = sem restrição de domínio</p>
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
