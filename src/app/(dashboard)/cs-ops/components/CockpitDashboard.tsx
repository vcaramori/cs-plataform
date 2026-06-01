'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, HeartPulse, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RiskManagementPanel } from './RiskManagementPanel'

export interface CockpitData {
  accountsHealth: any[]
  delayedPlaybooks: any[]
  openRisks: any[]
  allAccounts: any[]
  unassignedAccounts: any[]
}

const RISK_LABELS = {
  churn: 'Churn',
  downgrade: 'Downgrade',
  adoption: 'Adoção',
  relationship: 'Relacionamento'
}

const SEVERITY_STYLES = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
}

const SEVERITY_LABELS = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo'
}

export function CockpitDashboard({ data, onReload }: { data: CockpitData | null, onReload: () => void }) {
  if (!data) return null

  const items = [
    ...(data.unassignedAccounts || []).map(a => ({
      id: `unassigned-${a.id}`,
      type: 'unassigned',
      title: a.name,
      subtitle: 'Conta sem CSM válido',
      csm: 'Não atribuído',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10',
      link: `/accounts/${a.id}`,
      date: null,
      severity: undefined
    })),
    ...data.accountsHealth.map(a => ({
      id: `health-${a.id}`,
      type: 'health',
      title: a.name,
      subtitle: `Health Score: ${a.health_score}`,
      csm: a.profiles?.name || 'Não atribuído',
      icon: HeartPulse,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
      link: `/accounts/${a.id}`,
      date: null,
      severity: undefined
    })),
    ...data.delayedPlaybooks.map(p => ({
      id: `playbook-${p.id}`,
      type: 'playbook',
      title: p.accounts?.name || 'Conta desconhecida',
      subtitle: 'Playbook em atraso',
      csm: p.profiles?.name || 'Não atribuído',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
      link: `/playbooks/execution/${p.id}`,
      date: new Date(p.due_date).toLocaleDateString(),
      severity: undefined
    })),
    ...data.openRisks.map(r => ({
      id: `risk-${r.id}`,
      type: 'risk',
      title: r.accounts?.name || 'Conta desconhecida',
      subtitle: `Risco de ${RISK_LABELS[r.risk_type as keyof typeof RISK_LABELS] || r.risk_type}`,
      severity: r.severity,
      csm: r.profiles?.name || 'Não atribuído',
      icon: AlertTriangle,
      color: r.severity === 'critical' ? 'text-red-600' : 'text-amber-600',
      bg: r.severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10',
      link: `/accounts/${r.account_id}`,
      date: null
    }))
  ]

  // Sort by priority (risks -> health -> playbooks) or just show all
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card">
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4 text-red-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Health Score Crítico</h3>
          </div>
          <p className="text-2xl font-black text-red-600">{data.accountsHealth.length}</p>
        </Card>
        <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Playbooks Atrasados</h3>
          </div>
          <p className="text-2xl font-black text-amber-600">{data.delayedPlaybooks.length}</p>
        </Card>
        <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Riscos em Aberto</h3>
          </div>
          <p className="text-2xl font-black text-red-600">{data.openRisks.length}</p>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-black uppercase tracking-tight text-content-primary">Fila de Trabalho (Atenção Necessária)</h2>
          <RiskManagementPanel accounts={data.allAccounts || []} onSuccess={onReload} />
        </div>
        
        {items.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <p className="text-[11px] font-black uppercase tracking-widest">Nenhuma atenção necessária no momento</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {items.map((item, idx) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={item.link}>
                      <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card hover:border-border-divider/60 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.bg)}>
                            <Icon className={cn("w-5 h-5", item.color)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[13px] font-black uppercase tracking-tight text-content-primary">{item.title}</p>
                              {item.severity && (
                                <Badge className={cn("text-[8px] font-black uppercase border", SEVERITY_STYLES[item.severity as keyof typeof SEVERITY_STYLES])}>
                                  {SEVERITY_LABELS[item.severity as keyof typeof SEVERITY_LABELS] || item.severity}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-content-secondary uppercase tracking-widest font-black opacity-60">
                              <span>{item.subtitle}</span>
                              <span>•</span>
                              <span>{item.csm}</span>
                              {item.date && (
                                <>
                                  <span>•</span>
                                  <span>{item.date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-content-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Card>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
