'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { RiskCurationControl } from '@/components/risk/RiskCurationControl'

export type Curation = {
  decision: 'confirmed' | 'false_positive'
  reason: string | null
  risk_key: string | null
  created_at: string
}

export type RiskAccount = {
  id: string
  name: string
  segment: string | null
  health_score: number | null
  risk_score: number | null
  sentiment_label: string | null
  ai_reasoning: string | null
  analyzed_at: string | null
  isAtRisk: boolean
  curations?: Curation[]
}

export function RiskCockpitClient({ accounts }: { accounts: RiskAccount[] }) {
  const router = useRouter()

  if (accounts.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center">
        <ShieldCheck className="w-10 h-10 text-success mx-auto mb-3" />
        <p className="text-sm font-bold text-content-primary">Nenhuma conta em risco</p>
        <p className="text-xs text-content-secondary mt-1">Health ≥ 40 e sem sinais de risco da IA no portfólio.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
        {accounts.length} {accounts.length === 1 ? 'conta em risco' : 'contas em risco'}
      </p>
      {accounts.map(a => (
        <Card key={a.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-content-primary uppercase text-sm truncate">{a.name}</p>
                {a.segment && <Badge variant="outline" className="text-[9px] uppercase">{a.segment}</Badge>}
                {a.sentiment_label && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] uppercase">
                    {a.sentiment_label}
                  </Badge>
                )}
              </div>
              {a.ai_reasoning ? (
                <p className="text-xs text-content-secondary mt-1.5 line-clamp-3">{a.ai_reasoning}</p>
              ) : (
                <p className="text-xs text-content-secondary/60 mt-1.5 italic">Sem análise de risco da IA — sinalizado por health baixo.</p>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-content-secondary">Health</p>
                <p className={`text-lg font-black ${(a.health_score ?? 100) < 40 ? 'text-destructive' : 'text-content-primary'}`}>{a.health_score ?? '—'}</p>
              </div>
              {a.risk_score != null && (
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-content-secondary">Risco IA</p>
                  <p className="text-lg font-black text-destructive">{a.risk_score}</p>
                </div>
              )}
              <Link
                href={`/accounts/${a.id}`}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-plannera-orange hover:gap-2 transition-all"
              >
                Abrir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Curadoria + auditoria */}
          <div className="mt-3 pt-3 border-t border-border-divider/60 flex flex-col gap-2">
            <RiskCurationControl
              accountId={a.id}
              source="assessment"
              riskKey={a.sentiment_label ?? 'risk'}
              onDone={() => router.refresh()}
            />
            {a.curations && a.curations.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary/60">Auditoria</p>
                {a.curations.map((c, i) => (
                  <p key={i} className="text-[10px] text-content-secondary">
                    <span className={c.decision === 'false_positive' ? 'text-destructive font-bold' : 'text-success font-bold'}>
                      {c.decision === 'false_positive' ? 'Falso positivo' : 'Confirmado'}
                    </span>
                    {' · '}{(c.created_at || '').slice(0, 10)}{c.reason ? ` — ${c.reason}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
