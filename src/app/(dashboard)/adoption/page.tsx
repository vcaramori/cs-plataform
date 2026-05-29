import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { getPortfolioAdoption } from '@/lib/adoption/portfolio-adoption'
import { AdoptionPortfolioClient } from './components/AdoptionPortfolioClient'

export default async function AdoptionPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const portfolio = await getPortfolioAdoption(supabase)

  return (
    <PageContainer>
      <ModuleHeader
        title="Adoção"
        subtitle="Visão de portfólio: adoção por plano, barreiras e risco de downgrade"
        iconName="BarChart2"
      />

      <AdoptionPortfolioClient data={portfolio} />
    </PageContainer>
  )
}
