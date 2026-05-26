'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, Loader2 } from 'lucide-react'
import { WebhooksTab } from './WebhooksTab'
import { CRMTab } from './CRMTab'
import { SupportTab } from './SupportTab'
import { BITab } from './BITab'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'

export function IntegrationsClient() {
  const [activeTab, setActiveTab] = useState('webhooks')
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true)
        const response = await fetch('/api/accounts')
        if (response.ok) {
          const data = await response.json()
          setAccounts(data || [])
          if (data && data.length > 0) {
            setSelectedAccountId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading accounts:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [])

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <ModuleHeader
        title="Integrações"
        subtitle="Gerenciar conectores externos: CRM, Support, BI, Webhooks"
        iconName="Zap"
      />

      {/* Account Selector (only visible for CRM, BI, Webhooks tabs) */}
      {['webhooks', 'crm', 'bi'].includes(activeTab) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface-card border border-border-divider rounded-2xl shadow-sm animate-in fade-in duration-200">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-content-primary">Conta de Cliente</h3>
            <p className="text-xs text-content-secondary">
              Selecione o cliente para visualizar e gerenciar suas integrações específicas.
            </p>
          </div>
          <div className="w-full sm:w-72">
            {loading ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="w-4 h-4 animate-spin text-plannera-orange" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-xs text-yellow-600 font-semibold p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                Nenhum cliente cadastrado no sistema
              </div>
            ) : (
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                options={accounts.map((acc) => ({ label: acc.name, value: acc.id }))}
                placeholder="Selecione o Cliente..."
                size="sm"
              />
            )}
          </div>
        </div>
      )}

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
          {!selectedAccountId ? (
            <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center animate-in fade-in duration-200">
              <Zap className="w-12 h-12 text-border-divider mx-auto mb-4" />
              <p className="text-content-secondary mb-4">
                Nenhum cliente disponível. Cadastre um cliente primeiro para gerenciar seus Webhooks.
              </p>
            </div>
          ) : (
            <WebhooksTab accountId={selectedAccountId} />
          )}
        </TabsContent>

        <TabsContent value="crm" className="space-y-6">
          {!selectedAccountId ? (
            <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center animate-in fade-in duration-200">
              <div className="text-4xl mb-4">☁️</div>
              <p className="text-content-secondary mb-4">
                Nenhum cliente disponível. Cadastre um cliente primeiro para gerenciar sua integração de CRM.
              </p>
            </div>
          ) : (
            <CRMTab accountId={selectedAccountId} />
          )}
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <SupportTab />
        </TabsContent>

        <TabsContent value="bi" className="space-y-6">
          {!selectedAccountId ? (
            <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center animate-in fade-in duration-200">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-content-secondary mb-4">
                Nenhum cliente disponível. Cadastre um cliente primeiro para gerenciar sua integração de BI.
              </p>
            </div>
          ) : (
            <BITab accountId={selectedAccountId} />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
