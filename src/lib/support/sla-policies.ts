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
  const supabase = createAdminClient()

  let query = supabase
    .from('sla_policies')
    .select(`
      *,
      levels:sla_policy_levels(*),
      mappings:sla_level_mappings(*)
    `)
    .eq('is_active', true)

  if (contractId) {
    query = query.eq('contract_id', contractId)
  } else {
    query = query.eq('account_id', accountId)
  }

  const { data: policy, error } = await query.maybeSingle()

  if (error) {
    console.error(`[SLA Policies] Error fetching policy (acc:${accountId}, con:${contractId}):`, error)
    return null
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

  // Account specific hours override global hours for the same day
  const effectiveHours = new Map<number, BusinessHours>()
  
  // First load all global hours
  hours.filter(h => h.scope === 'global').forEach(h => effectiveHours.set(h.dow, h as BusinessHours))
  
  // Then override with account specific hours
  hours.filter(h => h.scope === 'account').forEach(h => effectiveHours.set(h.dow, h as BusinessHours))

  return Array.from(effectiveHours.values())
}
