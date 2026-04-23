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
import Link from 'next/link'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'

import { Card, CardContent } from "@/components/ui/card"

interface Props {
  id: string
  accountName: string
  displayContracts: any[]
  contracts: any[]
  interactions: any[]
  tickets: any[]
  efforts: any[]
  contacts: any[]
  successGoals: any[]
  adoptionMetrics: any[]
}

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function CompactContractCard({ contract, accountId }: { contract: any; accountId: string }) {
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
    active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20',
    'at-risk': 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-100 dark:border-amber-500/20',
    churned: 'bg-red-50 dark:bg-destructive/10 text-red-700 dark:text-destructive border-red-100 dark:border-destructive/20',
    'in-negotiation': 'bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border-indigo-100 dark:border-primary/20',
  }

  return (
    <Card variant="glass" className="rounded-2xl p-5 space-y-5 border-border shadow-md hover:bg-accent/10 transition-colors">
      {/* Cabeçalho do contrato */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-primary/10 border border-indigo-100 dark:border-primary/20">
            <FileText className="w-4 h-4 text-primary shrink-0" />
          </div>
          <span className="label-premium !text-[11px] truncate">
            {contract.description || contract.service_type || 'Draft Contratual'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="neutral" className={cn(
            "text-[9px] font-black uppercase tracking-widest border",
            statusColors[contract.status] ?? 'bg-accent/30 text-muted-foreground'
          )}>
            {statusLabels[contract.status] ?? contract.status}
          </Badge>
          <EditContractDialog contract={contract} />
        </div>
      </div>

      {/* Dados principais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-background border border-border-divider rounded-2xl p-4 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="label-premium !text-[9px] opacity-40">MRR Equity</span>
          </div>
          <p className="text-foreground text-base font-black tracking-tighter tabular-nums">
            {formatCurrency(contract.mrr || 0)}
          </p>
          {Number(contract.arr) > 0 && (
            <p className="label-premium !text-[8px] mt-2 opacity-30">
              ARR: {formatCurrency(contract.arr)}
            </p>
          )}
        </div>
        <div className="bg-surface-background border border-border-divider rounded-2xl p-4 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            <span className="label-premium !text-[9px] opacity-40">Renovação</span>
          </div>
          <p className={cn("text-base font-black tracking-tighter tabular-nums", renewalColor)}>
            {contract.renewal_date
              ? new Date(contract.renewal_date).toLocaleDateString('pt-BR')
              : 'Permanent'}
          </p>
          {days !== null && (
            <p className="label-premium !text-[8px] mt-2 opacity-30">
              {days < 0 ? `${Math.abs(days)}d expirado` : `T-minus ${days}d`}
            </p>
          )}
        </div>
      </div>

      {/* Horas contratadas */}
      {contract.contracted_hours_monthly > 0 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="label-premium !text-[9px] opacity-40">Horas Contratadas</span>
          <span className="text-foreground text-[10px] font-black tracking-tight">{contract.contracted_hours_monthly}h / Mês</span>
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
  adoptionMetrics
}: Props) {
  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Assistente IA Flutuante */}
      <AccountChat accountId={id} accountName={accountName} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,31fr)_minmax(0,45fr)_minmax(0,24fr)] gap-10 items-start">

        {/* COLUNA 1 — Linha do Tempo & Esforço */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-3 h-12">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                <History className="w-5 h-5" />
              </div>
              <h2 className="h2-section !text-base">Linha do Tempo</h2>
            </div>
            <span className="label-premium !text-[9px] opacity-30">Cognitive Stream</span>
          </div>
          <div className="lg:max-h-[85vh] overflow-y-auto custom-scrollbar pr-3">
            <AccountUnifiedTimeline
              interactions={interactions}
              efforts={efforts}
              accounts={[{ id, name: accountName }]}
            />
          </div>
        </div>

        {/* COLUNA 2 — Valor, Adoção & Atrito */}
        <div className="space-y-12 lg:border-x lg:border-border lg:px-10">

          {/* Resultados Estratégicos */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1 h-12">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <h2 className="h2-section !text-base">Success Plan</h2>
              </div>
              <Badge variant="neutral" className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20 px-3 py-1 text-[9px]">
                Validado
              </Badge>
            </div>
            <SuccessPlan goals={successGoals} />
          </section>

          {/* Uso & Adoção Funcional */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-1 h-12 mb-2">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border border-indigo-100 dark:border-primary/20 shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="h2-section !text-base">Adoção Executiva</h2>
            </div>
            <AdoptionExecutiveSection accountId={id} accountName={accountName} />
            
            {adoptionMetrics.length > 0 && (
              <div className="scale-[0.98] origin-top -mt-2 opacity-80">
                <AdoptionChart metrics={adoptionMetrics} />
              </div>
            )}
          </section>

          {/* Risco & Atrito */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center justify-between px-1 h-12">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-destructive/10 text-red-600 dark:text-destructive border border-red-100 dark:border-destructive/20 shadow-sm">
                  <Ticket className="w-5 h-5" />
                </div>
                <h2 className="h2-section !text-base">Atendimento & NPS</h2>
              </div>
              <Badge variant="neutral" className="bg-red-50 dark:bg-destructive/10 text-red-700 dark:text-destructive border-red-100 dark:border-destructive/20 px-3 py-1 text-[9px]">
                Attention
              </Badge>
            </div>
            <RecentTicketsWidget tickets={tickets} />
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
              <h2 className="h2-section !text-base">Mapeamento de Poder</h2>
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
                <h2 className="h2-section !text-base">Governança</h2>
              </div>
              <Link
                href={`/accounts/${id}/sla`}
                className="label-premium !text-[10px] text-primary hover:text-primary/80 transition-all flex items-center gap-2 group"
              >
                <Settings2 className="w-4 h-4 group-hover:rotate-45 transition-transform" /> 
                Policy
              </Link>
            </div>

            {displayContracts.length === 0 ? (
              <Card variant="glass" className="p-10 border-dashed border-border text-center shadow-none bg-accent/5">
                <p className="label-premium opacity-30 !text-[10px]">Sem dados contratuais registrados</p>
              </Card>
            ) : (
              <div className="space-y-5">
                {displayContracts.map((contract: any) => (
                  <CompactContractCard key={contract.id} contract={contract} accountId={id} />
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
              <h2 className="h2-section !text-base opacity-60">Evidence Center</h2>
            </div>
            <QuickDocuments accountName={accountName} />
          </section>
        </div>

      </div>
    </div>
  )
}

