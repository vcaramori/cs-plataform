'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function getSupabaseBrowserClient() {
  return createBrowserClient(env.supabase.url, env.supabase.anonKey)
}
