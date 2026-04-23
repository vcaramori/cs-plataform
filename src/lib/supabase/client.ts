'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { Database } from './types'

export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(env.supabase.url, env.supabase.anonKey)
}
