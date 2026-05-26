import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getUserRole } from '@/lib/supabase/server'
import type { Permission } from './permissions'
import { hasPermission } from './permissions'
import type { UserRole } from '@/lib/supabase/types'

export type AuthResult = {
  user: { id: string; email?: string }
  role: UserRole
}

/**
 * Centralised API auth guard.
 *
 * Usage (no permission check — just requires a logged-in user):
 *   const auth = await requireApiAuth()
 *   if (auth instanceof NextResponse) return auth
 *   // auth is { user, role }
 *
 * Usage (with permission check):
 *   const auth = await requireApiAuth('manage:users')
 *   if (auth instanceof NextResponse) return auth
 *
 * Usage (with any of multiple permissions):
 *   const auth = await requireApiAuth(['view:admin', 'manage:admin'])
 *   if (auth instanceof NextResponse) return auth
 */
export async function requireApiAuth(
  permission?: Permission | Permission[]
): Promise<AuthResult | NextResponse> {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    const hasAny = perms.some(p => hasPermission(role, p))
    if (!hasAny) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return { user, role }
}

/** Type guard to check if requireApiAuth returned an error response */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
