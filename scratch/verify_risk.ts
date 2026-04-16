import { getSupabaseAdminClient } from '../src/lib/supabase/admin'
import { getAccountPlanSummary } from '../src/lib/adoption/risk-engine'

async function test() {
  const supabase = getSupabaseAdminClient()
  
  const accounts = [
    { id: 'cf3b263a-07b3-4dc7-852a-fa71a1e6b2d8', name: 'General Mills (Professional)' },
    { id: '0ca608f3-f0bf-45bc-b7ce-3f3878e73c81', name: 'UltraTech (Essential)' }
  ]

  for (const acc of accounts) {
    console.log(`--- Testing ${acc.name} ---`)
    const summary = await getAccountPlanSummary(acc.id, supabase)
    console.log(JSON.stringify(summary, null, 2))
  }
}

test().catch(console.error)
