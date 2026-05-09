'use client'

import { Loader2, Clock, AlertCircle, CheckCircle2, Ban, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Feature {
  id: string
  name: string
  module: string
}

interface AdoptionRecord {
  id: string
  feature_id: string
  status: 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'
  observation: string | null
  blocker_category: 'data_integration' | 'product_roadmap' | 'people_process' | 'governance' | 'no_strategic_relevance' | 'other' | null
  blocker_reason: string | null
  action_plan: string | null
  action_owner: string | null
  responsible_id: string | null
  target_date: string | null
  action_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  priority_level: 'low' | 'medium' | 'high'
  product_features: Feature
}

interface AdoptionAnalyticsProps {
  records: AdoptionRecord[]
  loading: boolean
  selectedRecord: AdoptionRecord | null
  onSelectRecord: (record: AdoptionRecord) => void
}

export function AdoptionAnalytics({
  records,
  loading,
  selectedRecord,
  onSelectRecord
}: AdoptionAnalyticsProps) {
  const statusOptions = [
    { label: 'Não Iniciado', value: 'not_started', icon: Clock, color: 'text-content-secondary', bg: 'bg-surface-background' },
    { label: 'Uso Parcial', value: 'partial', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Em Uso', value: 'in_use', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Bloqueado', value: 'blocked', icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Não Aplicável', value: 'na', icon: HelpCircle, color: 'text-content-secondary', bg: 'bg-surface-background' },
  ]

  return (
    <div className="w-1/3 border-r border-border-divider overflow-y-auto p-4 space-y-2 custom-scrollbar bg-surface-background">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
          <span className="text-[10px] font-bold uppercase text-content-secondary tracking-widest">Sincronizando...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 opacity-40">
          <p className="text-[10px] font-bold uppercase text-content-secondary">Nenhuma funcionalidade no plano.</p>
        </div>
      ) : (
        records.map(r => {
          const status = statusOptions.find(s => s.value === r.status)
          const Icon = status?.icon || Clock
          return (
            <button
              key={r.id}
              onClick={() => onSelectRecord(r)}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 group",
                selectedRecord?.id === r.id
                  ? "bg-surface-card border-border-divider shadow-lg"
                  : "bg-transparent border-transparent hover:bg-surface-card",
                r.status === 'na' && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary">{r.product_features.module}</span>
                <Icon className={cn("w-3 h-3", status?.color)} />
              </div>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-tight transition-colors",
                selectedRecord?.id === r.id ? "text-content-primary" : "text-content-secondary group-hover:text-content-primary"
              )}>
                {r.product_features.name}
              </span>
              <Badge variant="outline" className={cn("w-fit text-[8px] border-none font-black uppercase", status?.bg, status?.color)}>
                {status?.label}
              </Badge>
            </button>
          )
        })
      )}
    </div>
  )
}
