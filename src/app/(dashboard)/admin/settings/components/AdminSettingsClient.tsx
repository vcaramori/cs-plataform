'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SlidersHorizontal } from 'lucide-react'
import { HealthSettingsTab } from './HealthSettingsTab'
import { SLASettingsTab } from './SLASettingsTab'
import { NPSSettingsTab } from './NPSSettingsTab'
import { AlertSettingsTab } from './AlertSettingsTab'
import { PlaybookSettingsTab } from './PlaybookSettingsTab'
import { AISettingsTab } from './AISettingsTab'
import { AIContextSettingsTab } from './AIContextSettingsTab'
import { SecuritySettingsTab } from './SecuritySettingsTab'
import { HelpDeskSettingsTab } from './HelpDeskSettingsTab'
import { ReadAiSettingsTab } from './ReadAiSettingsTab'
import { MicrosoftSettingsTab } from './MicrosoftSettingsTab'

const TABS = [
  { value: 'health', label: 'Health Score' },
  { value: 'sla', label: 'SLA' },
  { value: 'nps', label: 'NPS' },
  { value: 'alerts', label: 'Alertas' },
  { value: 'playbooks', label: 'Playbooks' },
  { value: 'ai', label: 'IA & RAG' },
  { value: 'ai_context', label: 'IA — Contexto & Regras' },
  { value: 'security', label: 'Segurança' },
  { value: 'helpdesk', label: 'HelpDesk' },
  { value: 'readai', label: 'Read.ai' },
  { value: 'microsoft', label: 'Calendário (Microsoft)' },
]

export function AdminSettingsClient() {
  const [activeTab, setActiveTab] = useState('health')

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <SlidersHorizontal className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Configurações do Sistema</h1>
        </div>
        <p className="label-premium">Parâmetros globais de health score, SLA, alertas, IA e segurança</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-surface-card border border-border-divider rounded-xl p-1 flex flex-wrap gap-1 h-auto">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg data-[state=active]:bg-surface-background text-[11px] font-bold uppercase tracking-wide"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="health"><HealthSettingsTab /></TabsContent>
        <TabsContent value="sla"><SLASettingsTab /></TabsContent>
        <TabsContent value="nps"><NPSSettingsTab /></TabsContent>
        <TabsContent value="alerts"><AlertSettingsTab /></TabsContent>
        <TabsContent value="playbooks"><PlaybookSettingsTab /></TabsContent>
        <TabsContent value="ai"><AISettingsTab /></TabsContent>
        <TabsContent value="ai_context"><AIContextSettingsTab /></TabsContent>
        <TabsContent value="security"><SecuritySettingsTab /></TabsContent>
        <TabsContent value="helpdesk"><HelpDeskSettingsTab /></TabsContent>
        <TabsContent value="readai"><ReadAiSettingsTab /></TabsContent>
        <TabsContent value="microsoft"><MicrosoftSettingsTab /></TabsContent>
      </Tabs>
    </PageContainer>
  )
}
