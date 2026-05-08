import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'
import { Database, UserRole, Profile } from './types'
import { getSupabaseAdminClient } from './admin'

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
    console.error('Error fetching user role:', error)
    return null
  }

  return data?.role || null
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data || null
}
