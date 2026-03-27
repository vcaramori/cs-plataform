import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Admin client bypassa RLS — usar APENAS em server-side (pipelines, cron jobs)
// NUNCA importar em Client Components ou módulos client-side
let adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdminClient() {
  if (!adminClient) {
    adminClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminClient
}
