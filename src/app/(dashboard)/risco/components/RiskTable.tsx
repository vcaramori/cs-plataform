'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { classifyHealth } from '@/lib/health/classify'
import { RiskCurationControl } from '@/components/risk/RiskCurationControl'
import {
  LEVEL_LABEL, LEVEL_BADGE, TREATMENT_LABEL, TREATMENT_BADGE, brlCompact,
  type AccountRiskProfile, type RiskLevel,
} from './risk-types'

const SEV_OPTS: (RiskLevel | 'all')[] = ['all', 'critical', 'high', 'medium', 'low']
const TRT_OPTS = ['all', 'pendente', 'em_tratamento', 'tratado'] as const

export function RiskTable({ accounts, showOwner, onChanged }: { accounts: AccountRiskProfile[]; showOwner: boolean; onChanged: () => void }) {
  const [sev, setSev] = useState<RiskLevel | 'all'>('all')
  const [seg, setSeg] = useState('all')
  const [trt, setTrt] = useState<typeof TRT_OPTS[number]>('all')
  const [q, setQ] = useState('')

  const segments = useMemo(() => Array.from(new Set(accounts.map(a => a.segment).filter(Boolean))) as string[], [accounts])

  const rows = accounts.filter(a => {
    if (a.curatedFalsePositive) return false
    if (sev !== 'all' && a.riskLevel !== sev) return false
    if (seg !== 'all' && a.segment !== seg) return false
    if (trt !== 'all' && a.treatment !== trt) return false
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const pill = (active: boolean) => cn('px-2.5 h-7 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-content-secondary hover:text-content-primary border border-border-divider')

  return (
    <Card className="p-4 border-border-divider">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p className="font-bold text-sm text-content-primary">Triagem priorizada ({rows.length})</p>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conta…" className="h-8 w-44 text-xs" />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {SEV_OPTS.map(s => <button key={s} onClick={() => setSev(s)} className={pill(sev === s)}>{s === 'all' ? 'Todas' : LEVEL_LABEL[s as RiskLevel]}</button>)}
        <span className="w-px h-5 bg-border-divider mx-1" />
        {TRT_OPTS.map(t => <button key={t} onClick={() => setTrt(t)} className={pill(trt === t)}>{t === 'all' ? 'Tratamento' : TREATMENT_LABEL[t]}</button>)}
        {segments.length > 0 && (
          <>
            <span className="w-px h-5 bg-border-divider mx-1" />
            <button onClick={() => setSeg('all')} className={pill(seg === 'all')}>Segmentos</button>
            {segments.map(s => <button key={s} onClick={() => setSeg(s)} className={pill(seg === s)}>{s}</button>)}
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[9px] font-black uppercase tracking-widest text-content-secondary border-b border-border-divider">
              <th className="py-2 pr-3">Conta</th>
              <th className="py-2 pr-3">Sev.</th>
              <th className="py-2 pr-3 text-center">Health</th>
              <th className="py-2 pr-3 text-center">Risco IA</th>
              <th className="py-2 pr-3">Motivo</th>
              <th className="py-2 pr-3 text-right">ARR</th>
              <th className="py-2 pr-3">Renov.</th>
              <th className="py-2 pr-3">Tratamento</th>
              <th className="py-2 pr-3">Curadoria</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center text-sm text-content-secondary">Nenhuma conta com os filtros atuais.</td></tr>
            ) : rows.map(a => (
              <tr key={a.id} className="border-b border-border-divider/60 hover:bg-muted/30 align-middle">
                <td className="py-2.5 pr-3"><span className="font-extrabold text-[12px] uppercase text-content-primary">{a.name}</span>{showOwner && a.owner_name && <span className="block text-[9px] text-content-secondary uppercase">{a.owner_name}</span>}</td>
                <td className="py-2.5 pr-3"><Badge className={cn('text-[9px] uppercase border-none', LEVEL_BADGE[a.riskLevel])}>{LEVEL_LABEL[a.riskLevel]}</Badge></td>
                <td className="py-2.5 pr-3 text-center"><span className={cn('font-black', a.health == null ? 'text-content-secondary' : classifyHealth(a.health).textClass)}>{a.health ?? '—'}</span></td>
                <td className="py-2.5 pr-3 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-black text-content-primary">{a.aiRisk ?? '—'}</span>
                    {a.aiFlag && <span className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">revisar</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-3 max-w-[220px]"><span className="text-[11px] text-content-secondary line-clamp-1">{a.reasons[0] ?? '—'}</span></td>
                <td className="py-2.5 pr-3 text-right text-[11px] text-content-secondary">{a.arr > 0 ? brlCompact(a.arr) : '—'}</td>
                <td className="py-2.5 pr-3 text-[11px] text-content-secondary">{a.renewalDays != null && a.renewalDays >= 0 ? `${a.renewalDays}d` : '—'}</td>
                <td className="py-2.5 pr-3"><Badge className={cn('text-[8px] uppercase border-none', TREATMENT_BADGE[a.treatment])}>{TREATMENT_LABEL[a.treatment]}</Badge></td>
                <td className="py-2.5 pr-3"><RiskCurationControl accountId={a.id} source="assessment" riskKey={a.riskLevel} onDone={onChanged} /></td>
                <td className="py-2.5"><Link href={`/accounts/${a.id}`} className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-plannera-orange hover:gap-2 transition-all">Abrir <ArrowRight className="w-3 h-3" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
