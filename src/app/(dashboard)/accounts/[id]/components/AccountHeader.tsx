'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Globe, Building2, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Account } from '@/lib/supabase/types'

function HealthRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span className="text-white font-bold text-lg relative z-10">{Math.round(score)}</span>
    </div>
  )
}

export function AccountHeader({ account, latestHealthScore }: {
  account: Account
  latestHealthScore?: { shadow_score: number | null; discrepancy_alert: boolean; shadow_reasoning: string | null } | null
}) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  async function handleGenerateShadowScore() {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erro ao gerar Shadow Score'); return }
      toast.success(`Shadow Score gerado: ${data.shadow_score}`)
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    down: <TrendingDown className="w-4 h-4 text-red-400" />,
    critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
    stable: <Minus className="w-4 h-4 text-slate-400" />,
  }[account.health_trend] ?? <Minus className="w-4 h-4 text-slate-400" />

  const segmentColor: Record<string, string> = {
    Enterprise: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Mid-Market': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    SMB: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </Link>
      <div className="flex items-center gap-5 flex-1">
        <div className="w-14 h-14 rounded-xl bg-indigo-800/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{account.name}</h1>
            <Badge className={`text-xs border ${segmentColor[account.segment] ?? ''}`}>{account.segment}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {account.industry && <span className="text-slate-400 text-sm">{account.industry}</span>}
            {account.website && (
              <a href={account.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm">
                <Globe className="w-3 h-3" />{account.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 bg-slate-900 rounded-xl border border-slate-800 px-5 py-3">
        <HealthRing score={account.health_score} />
        <div className="space-y-1">
          <p className="text-slate-400 text-xs">Health Score</p>
          <div className="flex items-center gap-1.5">
            {trendIcon}
            <span className="text-slate-300 text-xs capitalize">{account.health_trend}</span>
          </div>
          {latestHealthScore?.shadow_score !== null && latestHealthScore?.shadow_score !== undefined && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span className="text-indigo-300 text-xs">Shadow: {Math.round(Number(latestHealthScore.shadow_score))}</span>
            </div>
          )}
          {latestHealthScore?.discrepancy_alert && (
            <Badge className="bg-orange-500/20 text-orange-300 text-xs px-1.5 py-0.5">
              Score divergente
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGenerateShadowScore}
          disabled={generating}
          className="text-slate-500 hover:text-indigo-300 h-7 px-2 ml-1"
          title="Recalcular Shadow Score"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  )
}
