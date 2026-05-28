import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'
import { Database, UserRole, Profile } from './types'
import { getSupabaseAdminClient } from './admin'
import { parsePermissions } from '@/lib/auth/permission-schema'

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const authHeader = headerStore.get('Authorization')

  return createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : undefined,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component — cookies só podem ser setados em middleware/route handlers
        }
      },
    },
  })
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`No profile found for user ${userId} when fetching role`)
    } else {
      console.error('Error fetching user role:', error.message || error)
    }
    return null
  }

  return (data?.role as UserRole) || null
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, custom_roles(permissions)')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`No profile found for user ${userId} when fetching profile`)
    } else {
      console.error('Error fetching user profile:', error.message || error)
    }
    return null
  }

  if (!data) return null

  const rawPerms = (data as any).custom_roles?.permissions ?? null
  const custom_role_permissions = rawPerms ? parsePermissions(rawPerms) : null

  return {
    id: data.id,
    full_name: data.full_name,
    role: data.role as UserRole,
    avatar_url: data.avatar_url,
    user_type: (data as any).user_type ?? null,
    custom_role_id: (data as any).custom_role_id ?? null,
    custom_role_permissions,
    created_at: data.created_at || '',
    updated_at: data.updated_at || '',
  }
}
