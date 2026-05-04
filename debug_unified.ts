import { runAutomatedAccountAnalysis } from './src/lib/ai/automated-account-analysis.js'
import 'dotenv/config'

const ACCOUNT_ID = 'bea3f9ec-c9a8-407c-a3cb-e8c987ff1bdc'
const USER_ID = 'c1cfbf19-8fbf-4344-8093-3e03135f235f' // CSM Test

async function test() {
  console.log("Triggering final automated analysis for account:", ACCOUNT_ID)
  try {
    const result = await runAutomatedAccountAnalysis(ACCOUNT_ID, USER_ID)
    console.log("Analysis Finished:", result)
  } catch (err) {
    console.error("Test Failed:", err)
  }
}

test()
