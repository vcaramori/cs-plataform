'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ThumbsDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Decision = 'confirmed' | 'false_positive'

interface Props {
  accountId: string
  source: 'alert' | 'assessment'
  sourceId?: string
  riskKey?: string
  /** Chamado após salvar; recebe a decisão para o pai reagir (ex.: resolver alerta). */
  onDone?: (decision: Decision) => void
}

export function RiskCurationControl({ accountId, source, sourceId, riskKey, onDone }: Props) {
  const [mode, setMode] = useState<'idle' | 'reason'>('idle')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(decision: Decision, reasonText?: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/risk-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          source,
          source_id: sourceId,
          risk_key: riskKey,
          decision,
          reason: reasonText,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(typeof d.error === 'string' ? d.error : 'Erro ao salvar curadoria')
      }
      toast.success(decision === 'confirmed' ? 'Risco confirmado' : 'Falso positivo registrado — a IA vai considerar isso')
      setMode('idle')
      setReason('')
      onDone?.(decision)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar curadoria')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'reason') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Por que é falso positivo? (obrigatório — a IA usa para não repetir)"
          className="w-full text-xs rounded-lg border border-border-divider bg-surface-background p-2 min-h-[56px] text-content-primary"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-[10px]" onClick={() => setMode('idle')} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" className="text-[10px]" disabled={saving || !reason.trim()} onClick={() => save('false_positive', reason.trim())}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar falso positivo'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="gap-1 text-[10px]" disabled={saving} onClick={() => save('confirmed')}>
        <ShieldCheck className="w-3 h-3" /> Confirmar
      </Button>
      <Button size="sm" variant="ghost" className="gap-1 text-[10px] text-content-secondary hover:text-destructive" disabled={saving} onClick={() => setMode('reason')}>
        <ThumbsDown className="w-3 h-3" /> Falso positivo
      </Button>
    </div>
  )
}
