'use client'

import { useState } from 'react'
import { AccountUnifiedTimeline } from './AccountUnifiedTimeline'
import { SuccessPlan } from './SuccessPlan'
import { AdoptionChart } from './AdoptionChart'
import { RecentTicketsWidget } from './RecentTicketsWidget'
import { ContactsPowerMap } from './ContactsPowerMap'
import { QuickDocuments } from './QuickDocuments'
import { NewContractDialog } from './NewContractDialog'
import { AccountChat } from './AccountChat'
import { 
  History, 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  Ticket,
  ShieldCheck,
  FileBox
} from 'lucide-react'

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
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
      {/* AI Assistant Floating Drawer */}
      <AccountChat accountId={id} accountName={accountName} />

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-100 gap-6 items-start" style={{ gridTemplateColumns: 'minmax(0, 35fr) minmax(0, 40fr) minmax(0, 25fr)' }}>
        
        {/* COLUNA 1: Histórico & Esforço (35%) */}
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Timeline Unificada</h2>
              <span className="text-slate-600 text-[10px] ml-auto font-black uppercase tracking-widest">Feed de Eventos</span>
            </div>
            <AccountUnifiedTimeline 
              interactions={interactions} 
              efforts={efforts} 
              accounts={contracts.map(c => ({ id: id, name: accountName }))}
            />
          </section>
        </div>

        {/* COLUNA 2: Valor & Adoção (40%) */}
        <div className="space-y-8 bg-slate-900/30 border-x border-slate-800/30 px-6 min-h-[calc(100vh-250px)]">
          
          {/* Plano de Sucesso */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Plano de Sucesso</h2>
              <span className="text-slate-600 text-[10px] ml-auto font-black uppercase tracking-widest">Resultados</span>
            </div>
            <SuccessPlan goals={successGoals} />
          </section>

          {/* Adoção do Produto */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Adoção de Produto</h2>
              <span className="text-slate-600 text-[10px] ml-auto font-black uppercase tracking-widest">MAU Tendência</span>
            </div>
            <AdoptionChart metrics={adoptionMetrics} />
          </section>

          {/* Tickets Críticos */}
          <section className="space-y-4 pb-6">
            <div className="flex items-center gap-2 px-1">
              <Ticket className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Atrito & Suporte</h2>
              <span className="text-slate-600 text-[10px] ml-auto font-black uppercase tracking-widest">Tickets Abertos</span>
            </div>
            <RecentTicketsWidget tickets={tickets} />
          </section>
        </div>

        {/* COLUNA 3: Governança & Stakeholders (25%) */}
        <div className="space-y-8 h-full">
          
          {/* Power Map */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-tighter">Power Map</h2>
              <span className="text-slate-600 text-[10px] ml-auto font-black uppercase tracking-widest">Stakeholders</span>
            </div>
            <ContactsPowerMap contacts={contacts} accountId={id} />
          </section>

          {/* Governança de Contratos */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Contratos</h2>
              </div>
              <NewContractDialog accountId={id} />
            </div>
            <QuickDocuments contracts={contracts} />
          </section>

          {/* Arquivo & Aditivos */}
          <section className="space-y-4 opacity-50">
            <div className="flex items-center gap-2 px-1">
              <FileBox className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-black text-slate-300 uppercase tracking-tighter">Repositório</h2>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 border-dashed text-center">
               <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest leading-none">Em Breve: Airtable Sync</p>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}
