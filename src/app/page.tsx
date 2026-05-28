import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'

export default async function RootPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const canHome = await getModulePermission(user.id, 'home', 'view')
  redirect(canHome ? '/home' : '/dashboard')
}
