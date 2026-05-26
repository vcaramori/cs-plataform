import { redirect } from 'next/navigation'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import type { Permission } from './permissions'
import { hasPermission } from './permissions'
import type { UserRole, Profile } from '@/lib/supabase/types'

type PageAuthResult = {
  user: { id: string; email?: string }
  profile: Profile
}

/**
 * Centralised page auth guard for server components.
 *
 * Redirects to /login if not authenticated.
 * Redirects to /dashboard if missing required permission.
 *
 * Usage:
 *   const { user, profile } = await requirePageAuth()           // just logged in
 *   const { user, profile } = await requirePageAuth('view:admin') // with permission
 */
export async function requirePageAuth(permission?: Permission): Promise<PageAuthResult> {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)
  if (!profile) redirect('/login')

  if (permission && !hasPermission(profile.role, permission)) {
    redirect('/dashboard')
  }

  return { user, profile }
}
