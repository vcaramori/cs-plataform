import { getSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingGanttClient } from './OnboardingGanttClient'

export default async function OnboardingGanttPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-content-secondary font-medium">Usuário não autenticado.</p></div>
  }
  return <OnboardingGanttClient contractId={contractId} />
}
