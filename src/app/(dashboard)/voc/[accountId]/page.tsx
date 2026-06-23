import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { Skeleton } from '@/components/ui/skeleton'
import VocAccountClient from './VocAccountClient'

export default async function VocAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { accountId } = await params

  return (
    <PageContainer>
      <ModuleHeader
        title="Voz do Cliente — Conta"
        subtitle="Sentimento, dores e encantos desta conta, com a evidência de cada sinal"
        iconName="SmilePlus"
      />
      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-80 rounded-2xl" />}>
          <VocAccountClient accountId={accountId} />
        </Suspense>
      </div>
    </PageContainer>
  )
}
