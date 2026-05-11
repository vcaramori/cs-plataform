'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap } from 'lucide-react'
import { WebhooksTab } from './WebhooksTab'
import { CRMTab } from './CRMTab'
import { SupportTab } from './SupportTab'
import { BITab } from './BITab'

export function IntegrationsClient() {
  const [activeTab, setActiveTab] = useState('webhooks')

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Integrações</h1>
        </div>
        <p className="label-premium">Gerenciar conectores externos: CRM, Support, BI, Webhooks</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-surface-card border border-border-divider rounded-xl p-1 grid w-full grid-cols-4">
          <TabsTrigger value="webhooks" className="rounded-lg data-[state=active]:bg-surface-background">
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="crm" className="rounded-lg data-[state=active]:bg-surface-background">
            CRM
          </TabsTrigger>
          <TabsTrigger value="support" className="rounded-lg data-[state=active]:bg-surface-background">
            Support
          </TabsTrigger>
          <TabsTrigger value="bi" className="rounded-lg data-[state=active]:bg-surface-background">
            Business Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhooksTab />
        </TabsContent>

        <TabsContent value="crm" className="space-y-6">
          <CRMTab />
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <SupportTab />
        </TabsContent>

        <TabsContent value="bi" className="space-y-6">
          <BITab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
