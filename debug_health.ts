import { generateShadowScore } from './src/lib/health/shadow-score.js'
import { getSupabaseAdminClient } from './src/lib/supabase/admin.js'
import 'dotenv/config'

const ACCOUNT_ID = 'bea3f9ec-c9a8-407c-a3cb-e8c987ff1bdc'

async function test() {
  console.log("Testing generateShadowScore for account:", ACCOUNT_ID)
  try {
    const result = await generateShadowScore(ACCOUNT_ID)
    console.log("Result:", JSON.stringify(result, null, 2))
    
    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('health_scores').insert({
      account_id: ACCOUNT_ID,
      evaluated_at: new Date().toISOString().slice(0, 10),
      shadow_score: result.score,
      shadow_reasoning: result.justification,
      source_type: 'manual_debug'
    })
    
    if (error) console.error("Insert Error:", error)
    else console.log("Success! Record inserted.")
  } catch (err) {
    console.error("Test Failed:", err)
  }
}

test()
