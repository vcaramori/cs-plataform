import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { Database } from './types'

let browserClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey)
  }
  if (!browserClient) {
    browserClient = createClient<Database>(env.supabase.url, env.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }
  return browserClient
}
