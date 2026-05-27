'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Settings2, Sparkles, Loader2 } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { HealthScoreDetailsModal } from './HealthScoreDetailsModal'
import { MeetingPrepModal } from './MeetingPrepModal'
import { ModalSkeleton } from '@/components/LazyLoader'

const HealthScoreEditModal = lazy(() => import('../../../dashboard/components/HealthScoreEditModal').then(m => ({ default: m.HealthScoreEditModal })))
import { motion } from 'framer-motion'
import { Account, CommercialGovernance, HealthScore } from '@/lib/supabase/types'
import { HealthScoreCard } from './HealthScoreCard'
import { HealthMiniGauges } from './HealthMiniGauges'
import { MRRCard, RenewalCard } from './RenewalCard'
import { useRouter } from 'next/navigation'

export function AccountHeader({ account, latestHealthScore, currentAdoptionScore }: {
  account: Account & { contracts?: any[]; commercial_governance?: CommercialGovernance[]; discrepancy_alert?: boolean }
  latestHealthScore?: HealthScore | null
  currentAdoptionScore?: number
}) {
  const router = useRouter()
  const [showReasoning, setShowReasoning] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [slaActive, setSlaActive] = useState<boolean | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchHistory()
    fetchNPS()
    fetchSLA()
  }, [account.id])

  const handleGenerateShadowScore = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      })

      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        toast.error(`Erro crítico do servidor (500).`)
        return
      }

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao gerar Shadow Score')
        return
      }

      toast.success(`Shadow Score gerado: ${data.shadow_score}`)
      router.refresh()
    } catch (err: any) {
      toast.error('Erro de conexão ou falha no processamento.')
    } finally {
      setGenerating(false)
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`/api/health-scores/${account.id}`)
      const data = await res.json()
      setHistory(data.history || [])
      setSummaryData(data)
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  async function fetchNPS() {
    try {
      const res = await fetch(`/api/nps/stats?account_id=${account.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.total_responses > 0) setNpsScore(data.nps_score)
    } catch {}
  }

  async function fetchSLA() {
    try {
      const contracts = account.contracts || []
      const activeContract = contracts.find((c: any) => c.status === 'active') || contracts[0]
      if (!activeContract) { setSlaActive(false); return }
      const res = await fetch(`/api/sla-policies?contract_id=${activeContract.id}`)
      if (!res.ok) { setSlaActive(false); return }
      const data = await res.json()
      // If no custom policy exists, it inherits the active global standard SLA (true).
      // Otherwise, check the is_active property of the custom policy.
      setSlaActive(data === null ? true : data.is_active !== false)
    } catch { setSlaActive(false) }
  }

  const groupedSparkline = (history || []).reduce((acc: any, h: any) => {
    const dateKey = h.date
    if (!acc[dateKey]) {
      acc[dateKey] = { date: h.date, score: null }
    }
    acc[dateKey].score = h.manual_score ?? null
    return acc
  }, {})

  const chartData = (Object.values(groupedSparkline) as { date: string, score: number | null }[])
    .filter(d => d.score !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)

  const activeContract = account.contracts?.find((c: any) => c.status === 'active') || account.contracts?.[0]

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard" className="shrink-0">
            <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl shadow-sm border-border/50 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>

          <div className="flex items-center gap-4 min-w-0">
            {account.logo_url ? (
              <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-2xl bg-surface-background border border-border-divider/60 shadow-xl overflow-hidden shrink-0 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={account.logo_url}
                  alt={`${account.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl sm:text-3xl shadow-xl border border-primary/20 shrink-0">
                {account.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
                  {account.name}
                </h1>
                <Badge variant="neutral" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-black uppercase tracking-[0.2em] text-[9px] h-6 shrink-0 rounded-xl">
                  {account.segment}
                </Badge>
                <Link
                  href={`/accounts/${account.id}/edit`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all shadow-sm border border-border-divider"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="label-premium !text-[11px] opacity-60 flex items-center gap-2 mt-2 truncate">
                ID: {account.id.split('-')[0].toUpperCase()}{account.industry ? <><span className="opacity-60">/</span>{account.industry}</> : null}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
          <MeetingPrepModal accountId={account.id} accountName={account.name} />
          <MRRCard
            activeContract={activeContract}
            commercialGovernance={account.commercial_governance || []}
          />
          <RenewalCard
            accountId={account.id}
            activeContract={activeContract}
            commercialGovernance={account.commercial_governance || []}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <HealthScoreCard
          healthScore={account.health_score}
          healthTrend={account.health_trend}
          discrepancyAlert={account.discrepancy_alert}
          latestHealthScore={latestHealthScore}
          chartData={chartData}
          onEditClick={() => setShowEditModal(true)}
          onDetailsClick={() => setShowDetails(true)}
          accountId={account.id}
        />

        <HealthMiniGauges
          currentAdoptionScore={currentAdoptionScore}
          latestHealthScore={latestHealthScore}
          npsScore={npsScore}
          slaActive={slaActive}
          onShowReasoning={setShowReasoning}
          showReasoning={showReasoning}
          onGenerateShadowScore={handleGenerateShadowScore}
          generating={generating}
        />
      </div>

      {showReasoning && latestHealthScore?.shadow_reasoning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-background border border-primary/20 rounded-2xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-primary/50" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <span className="label-premium !text-xs text-primary">Strategic Reasoning Intelligence</span>
            </div>
            <Button
              onClick={handleGenerateShadowScore}
              disabled={generating}
              variant="premium"
              className="h-8 w-8 p-0 rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
              title="Gatilhar Análise Cognitiva"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-foreground text-sm italic font-medium leading-relaxed tracking-tight max-w-4xl">
            &quot;{latestHealthScore.shadow_reasoning}&quot;
          </p>
        </motion.div>
      )}

      <HealthScoreDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        accountId={account.id}
        accountName={account.name}
      />

      <Suspense fallback={<ModalSkeleton />}>
        <HealthScoreEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          account={{ id: account.id, name: account.name, health_score: account.health_score }}
          onSuccess={() => {
            router.refresh()
            fetchHistory()
          }}
        />
      </Suspense>
    </div>
  )
}
