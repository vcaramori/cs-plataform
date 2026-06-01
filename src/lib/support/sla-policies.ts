import { getSupabaseAdminClient as createAdminClient } from '../supabase/admin'
import { SLAPolicy, SLAPolicyLevel, SLALevelMapping, BusinessHours } from '../supabase/types'

export type FullSLAPolicy = SLAPolicy & {
  levels: SLAPolicyLevel[]
  mappings: SLALevelMapping[]
}

/**
 * Fetches the active SLA policy for a given account.
 * Uses Admin Client since SLA calculation often runs in background (IMAP/Cron).
 */
/**
 * Fetches the active SLA policy for a given account OR contract.
 * Primary choice is contract_id if provided.
 */
export async function getPolicyForAccount(accountId: string, contractId?: string | null): Promise<FullSLAPolicy | null> {
  console.log('[SLA Policies] Entering getPolicyForAccount. Account:', accountId, 'Contract:', contractId)
  let supabase;
  try {
    console.log('[SLA Policies] Creating admin client...')
    supabase = createAdminClient()
    console.log('[SLA Policies] Admin client created successfully')
  } catch (err) {
    console.error('[SLA Policies] Exception during createAdminClient:', err)
    throw err
  }

  let query = supabase
    .from('sla_policies')
    .select(`
      *,
      levels:sla_policy_levels(*),
      mappings:sla_level_mappings(*)
    `)
    .eq('is_active', true)

  if (contractId) {
    console.log('[SLA Policies] Querying by contract_id:', contractId)
    query = query.eq('contract_id', contractId)
  } else {
    console.log('[SLA Policies] Querying by account_id:', accountId)
    query = query.eq('account_id', accountId)
  }

  console.log('[SLA Policies] Executing query...')
  let result;
  try {
    result = await query.maybeSingle()
    console.log('[SLA Policies] Query execution returned successfully. Data:', result.data, 'Error:', result.error)
  } catch (err) {
    console.error('[SLA Policies] Query execution threw an error:', err)
    throw err
  }

  let policy = result.data
  const error = result.error

  if (error) {
    console.error(`[SLA Policies] Error fetching policy (acc:${accountId}, con:${contractId}):`, error)
    return null
  }

  // Fallback to global standard SLA policy if no custom policy exists for contract/account
  if (!policy) {
    console.log('[SLA Policies] Custom policy is null or use_global_standard is true. Querying global standard SLA...')
    const globalResult = await supabase
      .from('sla_policies')
      .select(`
        *,
        levels:sla_policy_levels(*),
        mappings:sla_level_mappings(*)
      `)
      .eq('is_global', true)
      .eq('is_active', true)
      .maybeSingle()

    if (globalResult.error) {
      console.error('[SLA Policies] Error fetching global standard SLA policy:', globalResult.error)
    } else if (globalResult.data) {
      policy = globalResult.data
    }
  }

  return policy as FullSLAPolicy | null
}

/**
 * Resolves the external priority label (from IMAP or Integrations) to an internal level.
 * Falls back to 'medium' if not found.
 */
/**
 * Resolves the external priority label to an internal level.
 * Implements the "Bug Blocker" rule: if category is BUG and label is Bug Blocker, it's always critical.
 * Otherwise, uses the contract's custom mappings.
 */
export function resolveInternalLevel(
  externalLabel: string | null, 
  mappings: SLALevelMapping[],
  category?: string | null
): 'critical' | 'high' | 'medium' | 'low' {
  const labelClean = externalLabel?.trim() ?? ''
  
  // Rule: Bug Blocker for category BUG = Critical
  if (category?.toLowerCase() === 'bug' && labelClean.toLowerCase() === 'bug blocker') {
    return 'critical'
  }

  if (!labelClean) return 'medium'
  
  const match = mappings.find(m => m.external_label.toLowerCase() === labelClean.toLowerCase())
  if (match) return match.internal_level

  // Smart fallbacks
  if (labelClean.toLowerCase().includes('blocker') || labelClean.toLowerCase().includes('critical')) return 'critical'
  if (labelClean.toLowerCase().includes('urgente') || labelClean.toLowerCase().includes('high')) return 'high'

  console.warn(`[SLA Policies] No mapping found for external label "${labelClean}". Falling back to "medium".`)
  return 'medium'
}

/**
 * Fetches the business hours to use for a given account.
 * Custom account hours override global hours if they exist for the same Day of Week.
 */
export async function getBusinessHoursForAccount(accountId: string | null): Promise<BusinessHours[]> {
  const supabase = createAdminClient()
  
  let query = supabase.from('business_hours').select('*').eq('is_active', true)
  
  if (accountId) {
    query = query.or(`scope.eq.global,account_id.eq.${accountId}`)
  } else {
    query = query.eq('scope', 'global')
  }

  const { data: hours, error } = await query

  if (error || !hours) {
    console.error(`[SLA Policies] Error fetching business hours:`, error)
    return []
  }

  // Self-healing: Seed global default business hours (Mon-Fri, 09:00 - 18:00) if table is empty
  if (hours.length === 0) {
    console.log('[SLA Policies] No business hours found in database. Seeding default global business hours (Mon-Fri, 09:00 - 18:00)...')
    const defaults = [
      { scope: 'global', dow: 1, start_time: '09:00', end_time: '18:00', is_active: true },
      { scope: 'global', dow: 2, start_time: '09:00', end_time: '18:00', is_active: true },
      { scope: 'global', dow: 3, start_time: '09:00', end_time: '18:00', is_active: true },
      { scope: 'global', dow: 4, start_time: '09:00', end_time: '18:00', is_active: true },
      { scope: 'global', dow: 5, start_time: '09:00', end_time: '18:00', is_active: true },
    ]
    const { data: seeded, error: seedError } = await supabase
      .from('business_hours')
      .insert(defaults)
      .select()

    if (seedError) {
      console.error('[SLA Policies] Error seeding default business hours:', seedError.message)
    } else if (seeded) {
      // Re-map or load newly seeded business hours
      const effectiveHours = new Map<number, BusinessHours>()
      seeded.forEach(h => effectiveHours.set(h.dow, h as BusinessHours))
      return Array.from(effectiveHours.values())
    }
  }

  // Account specific hours override global hours for the same day
  const effectiveHours = new Map<number, BusinessHours>()
  
  // First load all global hours
  hours.filter(h => h.scope === 'global').forEach(h => effectiveHours.set(h.dow, h as BusinessHours))
  
  // Then override with account specific hours
  hours.filter(h => h.scope === 'account').forEach(h => effectiveHours.set(h.dow, h as BusinessHours))

  return Array.from(effectiveHours.values())
}
