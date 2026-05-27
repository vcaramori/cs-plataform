import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { Database } from './types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey)
  }
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey)
  }
  return browserClient
}
