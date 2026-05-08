import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function RenewalPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('accounts')
    .select(`*, contracts(*)`)
    .eq('id', id)
    .single()

  if (!account) redirect('/dashboard')

  const activeContract = account.contracts?.find((c: any) => c.status === 'active') || account.contracts?.[0]

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/accounts/${id}`}>
          <Button variant="outline" size="icon" className="w-10 h-10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="h1-page">Renovação: {account.name}</h1>
          <p className="label-premium text-content-secondary">
            {activeContract?.renewal_date && new Date(activeContract.renewal_date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seção: 360° View */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-bold mb-4">Visão 360°</h2>
          <div className="space-y-4">
            <div className="p-4 bg-surface-background rounded-lg border border-border-divider">
              <p className="text-sm font-bold text-content-primary">Health Score</p>
              <p className="text-2xl font-black mt-2">{account.health_score?.toFixed(0) || 'N/A'}/100</p>
            </div>
            <div className="p-4 bg-surface-background rounded-lg border border-border-divider">
              <p className="text-sm font-bold text-content-primary">MRR</p>
              <p className="text-2xl font-black mt-2">{activeContract?.mrr?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Seção: Info */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Informações</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-content-secondary">Segmento</p>
              <p className="font-bold text-content-primary">{account.segment}</p>
            </div>
            <div>
              <p className="text-content-secondary">Status</p>
              <p className="font-bold text-content-primary">{activeContract?.status || 'N/A'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Seção: Em Desenvolvimento */}
      <Card className="mt-6 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">Cockpit em Desenvolvimento</h2>
        <p className="text-sm text-content-secondary">
          O painel completo de renovação com histórico de NPS, tickets, adoção e highlights por IA será disponibilizado em breve.
        </p>
      </Card>
    </PageContainer>
  )
}
