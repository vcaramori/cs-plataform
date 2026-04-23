import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { Database } from './types'

// Admin client bypassa RLS — usar APENAS em server-side (pipelines, cron jobs)
// NUNCA importar em Client Components ou módulos client-side
let adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}

// Alias para compatibilidade com código legado
export const createAdminClient = getSupabaseAdminClient
