import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-content-secondary font-medium">Usuário não autenticado.</p>
      </div>
    )
  }

  return (
    <Suspense>
      <OnboardingClient />
    </Suspense>
  )
}
