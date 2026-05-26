import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/csm-queue-stats
 * Returns queue statistics for all CSMs with caching (30s)
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30, s-maxage=30',
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('csm_queue_stats')
      .select('csm_id, csm_name, csm_email, max_capacity, assigned_count, available_slots, load_percentage, status')
      .order('csm_name', { ascending: true })

    if (error) {
      console.error('[CSM Queue Stats] Error fetching data:', error)
      return NextResponse.json({ error: 'Failed to fetch CSM queue stats' }, { status: 500, headers })
    }

    const stats = (data || []).map((row: any) => ({
      csm_id: row.csm_id,
      csm_name: row.csm_name,
      csm_email: row.csm_email,
      max_capacity: parseInt(row.max_capacity) || 20,
      assigned_count: parseInt(row.assigned_count) || 0,
      available_slots: parseInt(row.available_slots) || 20,
      load_percentage: parseFloat(row.load_percentage) || 0,
      status: row.status,
    }))

    return NextResponse.json(stats, { headers })
  } catch (error) {
    console.error('[CSM Queue Stats] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
