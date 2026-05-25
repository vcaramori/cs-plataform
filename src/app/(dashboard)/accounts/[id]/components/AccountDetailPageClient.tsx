'use client'

import { AccountUnifiedTimeline } from './AccountUnifiedTimeline'
import { SuccessPlan } from './SuccessPlan'
import { AdoptionExecutiveSection } from './AdoptionExecutiveSection'
import { RecentTicketsWidget } from './RecentTicketsWidget'
import { ContactsPowerMap } from './ContactsPowerMap'
import { QuickDocuments } from './QuickDocuments'
import { AccountChat } from './AccountChat'
import { EditContractDialog } from './EditContractDialog'
import { AdoptionChart } from './AdoptionChart'
import { PlaybookWidget } from './PlaybookWidget'
import { calculateNetMRR, calculateCurrentDiscount } from '@/lib/utils/contract-utils'
import Link from 'next/link'
import { StartPlaybookDialog } from './StartPlaybookDialog'
import {
  History,
  TrendingUp,
  Users,
  Target,
  Ticket,
  ShieldCheck,
  FolderOpen,
  DollarSign,
  CalendarDays,
  FileText,
  Settings2,
  BrainCircuit,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { Text } from '@/components/ui/typography'
import { Card, CardContent } from "@/components/ui/card"
import type { 
  Contract, 
  Interaction, 
  SupportTicket, 
  Contact, 
  SuccessPlanGoal, 
  AdoptionMetrics,
  NPSResponse, 
  CommercialGovernance, 
  HealthScore,
  AccountPlaybook,
  TimeEntry
} from '@/lib/supabase/types'
import type { Database } from '@/lib/supabase/database.types'

type RiskAssessmentRow = Database['public']['Tables']['account_risk_assessments']['Row']


interface Props {
  id: string
  accountName: string
  displayContracts: Contract[]
  contracts: Contract[]
  interactions: Interaction[]
  tickets: SupportTicket[]
  efforts: TimeEntry[]
  contacts: Contact[]
  successGoals: SuccessPlanGoal[]
  adoptionMetrics: AdoptionMetrics[]
  activePlaybook?: AccountPlaybook
  latestRiskAssessment?: RiskAssessmentRow
  npsResponses: NPSResponse[]
  playbooks?: AccountPlaybook[]
  commercialGovernance: CommercialGovernance[]
  healthScores?: HealthScore[]
}


function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function CompactContractCard({ contract, accountId, governanceRules }: { contract: Contract; accountId: string, governanceRules: CommercialGovernance[] }) {

  const days = daysUntil(contract.renewal_date)
  const renewalColor =
    days === null ? 'text-muted-foreground'
    : days < 0    ? 'text-destructive font-black'
    : days < 30   ? 'text-destructive font-black'
    : days < 90   ? 'text-amber-500 font-black'
    : 'text-emerald-500 font-black'

  const statusLabels: Record<string, string> = {
    active: 'Ativo', 'at-risk': 'Em Risco', churned: 'Churn', 'in-negotiation': 'Negociação',
  }
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    'at-risk': 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20',
    churned: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    'in-negotiation': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  }

  const netMRR = calculateNetMRR(contract, governanceRules)
  const discount = calculateCurrentDiscount(contract, governanceRules)
  const hasDiscount = discount > 0

  return (
    <Card className="rounded-2xl p-5 space-y-5 border-border-divider shadow-md hover:bg-accent/10 transition-colors">

      {/* Cabeçalho do contrato */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4 shrink-0" />
          </div>
          <Text variant="primary" className="!text-[11px] font-black uppercase tracking-widest truncate">
            {contract.description || contract.service_type || 'Draft Contratual'}
          </Text>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="neutral" className={cn(
            "text-[9px] font-black uppercase tracking-widest border px-2 py-0.5",
            statusColors[contract.status] ?? 'bg-accent/30 text-content-secondary'
          )}>
            {statusLabels[contract.status] ?? contract.status}
          </Badge>
          <EditContractDialog contract={contract} />
        </div>
      </div>

      {/* Dados principais */}
      <div className="flex flex-col gap-3">
        {/* Card MRR */}
        <div className="flex items-center justify-between p-4 bg-surface-background/50 rounded-xl hover:bg-surface-background transition-colors border border-border-divider/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">
                MRR Líquido R$
              </Text>
              {hasDiscount && (
                <Text variant="secondary" className="!text-[8px] font-black uppercase tracking-widest opacity-40 line-through select-none">
                  Nominal: {Math.round(contract.mrr).toLocaleString('pt-BR')}
                </Text>
              )}
            </div>
          </div>
          <div className="text-right">
            <Text variant="primary" className="text-base font-black tracking-tighter tabular-nums">
              {Math.round(netMRR).toLocaleString('pt-BR')}
            </Text>
          </div>
        </div>

        {/* Card Renovação */}
        <div className="flex items-center justify-between p-4 bg-surface-background/50 rounded-xl hover:bg-surface-background transition-colors border border-border-divider/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">
                Renovação
              </Text>
              {days !== null && (
                <Text variant="secondary" className="!text-[8px] font-black uppercase tracking-widest opacity-50 select-none">
                  {days < 0 ? `${Math.abs(days)}d expirado` : `T-minus ${days}d`}
                </Text>
              )}
            </div>
          </div>
          <div className="text-right">
            <Text className={cn("text-base font-black tracking-tighter tabular-nums", renewalColor)}>
              {contract.renewal_date
                ? (() => {
                    const parts = contract.renewal_date.split('T')[0].split('-')
                    if (parts.length === 3) {
                      const [year, month, day] = parts
                      return `${day}/${month}/${year.slice(-2)}`
                    }
                    return contract.renewal_date
                  })()
                : 'Permanent'}
            </Text>
          </div>
        </div>
      </div>

      {/* Horas contratadas */}
      {contract.contracted_hours_monthly > 0 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">Horas Contratadas</Text>
          <Text variant="primary" className="text-[10px] font-black tracking-tight">{contract.contracted_hours_monthly}h / Mês</Text>
        </div>
      )}
    </Card>
  )
}

export function AccountDetailPageClient({
  id,
  accountName,
  displayContracts,
  contracts,
  interactions,
  tickets,
  efforts,
  contacts,
  successGoals,
  adoptionMetrics,
  activePlaybook,
  latestRiskAssessment,
  npsResponses,
  playbooks = [],
  commercialGovernance,
  healthScores = []
}: Props) {
  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Assistente IA Flutuante */}
      <AccountChat accountId={id} accountName={accountName} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,31fr)_minmax(0,45fr)_minmax(0,24fr)] gap-6 items-start">

        {/* COLUNA 1 — Linha do Tempo & Esforço */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-3 h-12">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                <History className="w-5 h-5" />
              </div>
              <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Linha do Tempo</Text>
            </div>
            <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">Cognitive Stream</Text>
          </div>
          <div className="pr-3 overflow-x-hidden">
            <AccountUnifiedTimeline
              interactions={interactions}
              efforts={efforts}
              tickets={tickets}
              npsResponses={npsResponses}
              playbooks={playbooks}
              contracts={contracts}
              healthScores={healthScores}
              accounts={[{ id, name: accountName }]}
              accountName={accountName}
            />
          </div>
        </div>

        {/* COLUNA 2 — Valor, Adoção & Atrito */}
        <div className="space-y-12 lg:border-x lg:border-border-divider lg:px-6">

          {/* AI Risk Alert */}
          {latestRiskAssessment && (latestRiskAssessment.sentiment_label === 'negative' || latestRiskAssessment.sentiment_label === 'at-risk') && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-destructive/20 bg-red-50 dark:bg-destructive/10 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-destructive/20 text-destructive shrink-0">
                    {latestRiskAssessment.sentiment_label === 'at-risk' ? <AlertTriangle className="w-5 h-5" /> : <BrainCircuit className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Text variant="destructive" className="text-sm font-black tracking-tight uppercase">
                        Alerta IA: {latestRiskAssessment.sentiment_label === 'at-risk' ? 'Risco de Churn' : 'Atrito Severo'}
                      </Text>
                      <Badge variant="neutral" className="bg-destructive/20 text-destructive font-black border-none">
                        Score: {latestRiskAssessment.risk_score}/100
                      </Badge>
                    </div>
                    <Text variant="secondary" className="text-sm leading-relaxed font-medium">
                      {latestRiskAssessment.ai_reasoning}
                    </Text>
                    <Text variant="secondary" className="text-[10px] uppercase tracking-wider font-bold opacity-50 pt-2 select-none">
                      Analisado em: {new Date(latestRiskAssessment.analyzed_at).toLocaleString('pt-BR')}
                    </Text>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Active Playbook (Se houver) */}
          {activePlaybook ? (
            <section className="space-y-6">
              <PlaybookWidget playbook={activePlaybook} />
            </section>
          ) : (
            <section className="space-y-6">
              <div className="flex items-center gap-4 px-1 h-12">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Playbooks</Text>
              </div>
              <StartPlaybookDialog accountId={id} accountName={accountName} />
            </section>
          )}

          {/* Resultados Estratégicos */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1 h-12">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-success/10 text-emerald-600 dark:text-success border border-success-100 dark:border-success-500/20 shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Success Plan</Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="bg-emerald-50 dark:bg-success/10 text-emerald-700 dark:text-success border-success-100 dark:border-success-500/20 px-3 py-1 text-[9px] border-none">
                  Validado
                </Badge>
                <Link href={`/accounts/${id}/success-plan`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    Gerenciar
                  </Button>
                </Link>
              </div>
            </div>
            <SuccessPlan goals={successGoals} />
          </section>

          {/* Uso & Adoção Funcional */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-1 h-12 mb-2">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Adoção Executiva</Text>
            </div>
            <AdoptionExecutiveSection accountId={id} accountName={accountName} />
            
            {adoptionMetrics.length > 0 && (
              <div className="scale-[0.98] origin-top -mt-2 opacity-80">
                <AdoptionChart metrics={adoptionMetrics.map(m => ({ measured_at: m.week_date, value: m.adoption_score }))} />
              </div>
            )}
          </section>
        </div>

        {/* COLUNA 3 — Mapa de Influência, Governança, Arquivos */}
        <div className="space-y-12">

          {/* Mapa de Influência */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-1 h-12">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Mapeamento de Poder</Text>
            </div>
            <ContactsPowerMap contacts={contacts} accountId={id} />
          </section>

          {/* Governança Contratual */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1 h-12">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-surface-background text-content-secondary border border-border-divider shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider select-none">Governança</Text>
              </div>
              <Link
                href={`/accounts/${id}/sla`}
                className="text-[10px] text-primary hover:text-primary/80 font-black uppercase tracking-widest transition-all flex items-center gap-2 group"
              >
                <Settings2 className="w-4 h-4 group-hover:rotate-45 transition-transform" /> 
                SLA
              </Link>
            </div>

            {displayContracts.length === 0 ? (
              <Card className="p-10 border-dashed border-border-divider text-center shadow-none bg-accent/5">
                <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-widest opacity-60 select-none">Sem dados contratuais registrados</Text>
              </Card>
            ) : (
              <div className="space-y-5">
                {displayContracts.map((contract: Contract) => (
                  <CompactContractCard 
                    key={contract.id} 
                    contract={contract} 
                    accountId={id} 
                    governanceRules={commercialGovernance}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Central de Arquivos — SharePoint */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-1 h-12">
              <div className="p-2.5 rounded-xl bg-surface-background text-content-secondary border border-border-divider shadow-sm">
                <FolderOpen className="w-5 h-5" />
              </div>
              <Text variant="secondary" className="!text-[10px] font-black uppercase tracking-wider opacity-60 select-none">Evidence Center</Text>
            </div>
            <QuickDocuments accountName={accountName} />
          </section>
        </div>

      </div>
    </div>
  )
}

