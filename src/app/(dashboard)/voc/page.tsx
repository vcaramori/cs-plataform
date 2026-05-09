import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VocBoardClient from './components/VocBoardClient'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'

export default async function VocPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <ModuleHeader 
        title="Voice of Customer" 
        subtitle="Análise de sentimentos, temas e feedback do cliente"
        iconName="SmilePlus"
      />

      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
          <VocBoardClient />
        </Suspense>
      </div>
    </PageContainer>
  )
}
