import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function loadInstruction(key: string, fallback: string): Promise<string> {
  try {
    const admin = getSupabaseAdminClient()
    const { data } = await (admin as any)
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single()
    const custom = data?.value
    if (typeof custom === 'string' && custom.trim()) return custom
  } catch {}
  return fallback
}
