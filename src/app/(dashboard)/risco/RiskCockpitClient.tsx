'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { RiskKpis } from './components/RiskKpis'
import { RiskMatrix } from './components/RiskMatrix'
import { RiskKanban } from './components/RiskKanban'
import { RiskDistributions } from './components/RiskDistributions'
import { RiskTable } from './components/RiskTable'
import type { CockpitData } from './components/risk-types'

export function RiskCockpitClient() {
  const [data, setData] = useState<CockpitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/risk-cockpit')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Falha ao carregar o cockpit de risco')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Reavalia o motor (popula alertas → drivers/tratamento) e recarrega.
  const evaluateNow = async () => {
    setEvaluating(true)
    try {
      await fetch('/api/alerts/evaluate', { method: 'POST' })
      await load()
      toast.success('Risco reavaliado')
    } catch {
      toast.error('Falha ao reavaliar')
    } finally { setEvaluating(false) }
  }

  if (loading && !data) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-accent" /></div>
  }
  if (!data) return null

  const showOwner = data.scope === 'global'
  const hasRisk = (data.kpis?.accountsAtRisk ?? 0) > 0 || data.accounts.length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 text-[10px] font-black uppercase tracking-widest"><RefreshCw className="w-4 h-4" /> Atualizar</Button>
        <Button size="sm" onClick={evaluateNow} disabled={evaluating} className="gap-2 text-[10px] font-black uppercase tracking-widest">{evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Reavaliar risco</Button>
      </div>

      <RiskKpis kpis={data.kpis} />

      {!hasRisk ? (
        <Card className="border-dashed p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-content-primary">Portfólio saudável</p>
          <p className="text-xs text-content-secondary mt-1">Nenhuma conta em risco no escopo atual.</p>
        </Card>
      ) : (
        <>
          <RiskMatrix accounts={data.accounts} />
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Carteira por severidade</p>
            <RiskKanban accounts={data.accounts} />
          </div>
          <RiskDistributions data={data} showOwner={showOwner} />
          <RiskTable accounts={data.accounts} showOwner={showOwner} onChanged={load} />
        </>
      )}
    </div>
  )
}
