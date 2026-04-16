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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'

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
    days === null ? 'text-slate-400'
    : days < 0    ? 'text-red-400'
    : days < 30   ? 'text-red-400'
    : days < 90   ? 'text-yellow-400'
    : 'text-emerald-400'

  const statusLabels: Record<string, string> = {
    active: 'Ativo', 'at-risk': 'Em Risco', churned: 'Churn', 'in-negotiation': 'Negociação',
  }
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    'at-risk': 'bg-yellow-500/10 text-yellow-400',
    churned: 'bg-red-500/10 text-red-400',
    'in-negotiation': 'bg-indigo-500/10 text-indigo-400',
  }

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 border-none">
      {/* Cabeçalho do contrato */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-plannera-ds shrink-0" />
          <span className="text-white text-xs font-bold uppercase tracking-tight truncate">
            {contract.description || contract.service_type || 'Contrato'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide",
            statusColors[contract.status] ?? 'bg-slate-500/10 text-slate-400'
          )}>
            {statusLabels[contract.status] ?? contract.status}
          </span>
          <EditContractDialog contract={contract} />
        </div>
      </div>

      {/* Dados principais */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3 text-plannera-ds" />
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wide">MRR</span>
          </div>
          <p className="text-white text-sm font-bold">
            {formatCurrency(contract.mrr || 0)}
          </p>
          {Number(contract.arr) > 0 && (
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-wide mt-0.5">
              ARR: {formatCurrency(contract.arr)}
            </p>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarDays className="w-3 h-3 text-plannera-sop" />
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wide">Renovação</span>
          </div>
          <p className={cn("text-sm font-bold", renewalColor)}>
            {contract.renewal_date
              ? new Date(contract.renewal_date).toLocaleDateString('pt-BR')
              : 'N/A'}
          </p>
          {days !== null && (
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-wide mt-0.5">
              {days < 0 ? `${Math.abs(days)}d expirado` : `em ${days}d`}
            </p>
          )}
        </div>
      </div>

      {/* Horas contratadas */}
      {contract.contracted_hours_monthly > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-600 text-[9px] font-bold uppercase tracking-wide">Horas/mês</span>
          <span className="text-slate-400 text-[10px] font-bold">{contract.contracted_hours_monthly}h</span>
        </div>
      )}
    </div>
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
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Assistente IA Flutuante */}
      <AccountChat accountId={id} accountName={accountName} />

      {/*
        Grid de 3 colunas proporcional.
        Apenas em lg+ (≥1024px) aplica a proporção 31/45/24.
        Abaixo disso: coluna única.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,31fr)_minmax(0,45fr)_minmax(0,24fr)] gap-6 items-start">

        {/* COLUNA 1 — Linha do Tempo & Esforço (31%) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 h-8">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-plannera-sop" />
              <h2 className="text-xs font-heading font-extrabold text-white uppercase tracking-wide">Linha do Tempo</h2>
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wide">Eventos ao Vivo</span>
          </div>
          <div className="lg:max-h-[85vh] overflow-y-auto scrollbar-none pr-1">
            <AccountUnifiedTimeline
              interactions={interactions}
              efforts={efforts}
              accounts={[{ id, name: accountName }]}
            />
          </div>
        </div>

        {/* COLUNA 2 — Valor, Adoção & Atrito (45%) */}
        <div className="space-y-8 lg:bg-white/[0.01] lg:border-x lg:border-white/5 lg:px-8">

          {/* Resultados Estratégicos */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1 h-8">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-plannera-ds" />
                <h2 className="text-xs font-heading font-extrabold text-white uppercase tracking-wide">Resultados Estratégicos</h2>
              </div>
              <Badge variant="outline" className="bg-plannera-ds/5 text-plannera-ds border-none text-[10px] font-bold">
                Plano Verificado
              </Badge>
            </div>
            <SuccessPlan goals={successGoals} />
          </section>

          {/* Uso & Adoção Funcional */}
          <section className="space-y-4">
            <AdoptionExecutiveSection accountId={id} accountName={accountName} />
            
            {/* Mantemos o gráfico histórico de métricas abaixo como visão complementar se houver dados */}
            {adoptionMetrics.length > 0 && (
              <div className="scale-90 origin-top -mt-4 opacity-60">
                <AdoptionChart metrics={adoptionMetrics} />
              </div>
            )}
          </section>

          {/* Risco & Atrito */}
          <section className="space-y-4 pb-8">
            <div className="flex items-center justify-between px-1 h-8">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-plannera-demand" />
                <h2 className="text-xs font-heading font-extrabold text-white uppercase tracking-wide">Risco & Atrito</h2>
              </div>
              <Badge variant="outline" className="bg-plannera-demand/5 text-plannera-demand border-none text-[10px] font-bold">
                Atenção Necessária
              </Badge>
            </div>
            <RecentTicketsWidget tickets={tickets} />
          </section>
        </div>

        {/* COLUNA 3 — Mapa de Influência, Governança, Arquivos (24%) */}
        <div className="space-y-8">

          {/* Mapa de Influência */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1 h-8">
              <Users className="w-4 h-4 text-plannera-orange" />
              <h2 className="text-xs font-heading font-extrabold text-white uppercase tracking-wide">Mapa de Influência</h2>
            </div>
            <ContactsPowerMap contacts={contacts} accountId={id} />
          </section>

          {/* Governança Contratual */}
          <section className="space-y-4">
            <div className="flex items-center px-1 h-8">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-plannera-ds" />
                <h2 className="text-xs font-heading font-extrabold text-white uppercase tracking-wide">Governança</h2>
              </div>
            </div>

            {displayContracts.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                <p className="text-slate-600 text-xs font-bold uppercase tracking-wide">Nenhum contrato ativo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayContracts.map((contract: any) => (
                  <CompactContractCard key={contract.id} contract={contract} accountId={id} />
                ))}
              </div>
            )}
          </section>

          {/* Central de Arquivos — SharePoint */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1 h-8">
              <FolderOpen className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-heading font-extrabold text-slate-300 uppercase tracking-wide">Central de Arquivos</h2>
            </div>
            <QuickDocuments accountName={accountName} />
          </section>
        </div>

      </div>
    </div>
  )
}
