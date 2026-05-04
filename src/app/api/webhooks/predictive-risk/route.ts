import { NextResponse } from 'next/server'
import { runPredictiveRiskAnalysis } from '@/lib/ai/predictive-risk'

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-api-secret')
    // Apenas permitindo a secret local ou do Vercel para chamadas internas seguras
    if (secret !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { account_id } = await request.json()
    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
    }

    const result = await runPredictiveRiskAnalysis(account_id)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('[Webhook Predictive Risk] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
