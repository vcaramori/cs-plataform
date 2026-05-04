import 'dotenv/config'
import { runPredictiveRiskAnalysis } from './src/lib/ai/predictive-risk'
import { generateShadowScore } from './src/lib/health/shadow-score'

async function main() {
  const accountId = 'bea3f9ec-c9a8-407c-a3cb-e8c987ff1bdc'
  console.log('--- Testing Predictive Risk ---')
  try {
    const risk = await runPredictiveRiskAnalysis(accountId)
    console.log('Risk Result:', JSON.stringify(risk, null, 2))
  } catch (err) {
    console.error('Risk Error:', err)
  }

  console.log('\n--- Testing Shadow Score ---')
  try {
    const shadow = await generateShadowScore(accountId)
    console.log('Shadow Result:', JSON.stringify(shadow, null, 2))
  } catch (err) {
    console.error('Shadow Error:', err)
  }
}

main()
