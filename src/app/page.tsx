import { redirect } from 'next/navigation'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'

export default async function RootPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  // Portal/external users always go to the client portal — never the internal platform.
  if (profile?.user_type === 'external') redirect('/portal/dashboard')

  const canHome = await getModulePermission(user.id, 'home', 'view')
  redirect(canHome ? '/home' : '/dashboard')
}
