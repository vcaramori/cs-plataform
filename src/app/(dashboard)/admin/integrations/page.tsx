import { redirect } from 'next/navigation'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { IntegrationsClient } from './components/IntegrationsClient'

export default async function IntegrationsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  return <IntegrationsClient />
}
