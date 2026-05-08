import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { Zap } from 'lucide-react'
import { HomePrioritiesClient } from './components/HomePrioritiesClient'
import { DailyBriefingCard } from './components/DailyBriefingCard'

export default async function HomePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Command Center</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Priorização inteligente da sua carteira com recomendações por IA.
        </p>
      </div>

      <DailyBriefingCard />
      <HomePrioritiesClient />
    </PageContainer>
  )
}
