import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const authHeader = headerStore.get('Authorization')

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
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
