import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 300

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const processed: any[] = []
  const errors: any[] = []

  try {
    // Get all unique CSMs with active accounts
    const { data: allAccounts, error: csmsError } = await supabase
      .from('accounts')
      .select('csm_owner_id')
      .eq('contract_status', 'active')

    if (csmsError) throw csmsError

    // Get unique CSM IDs
    const uniqueCsmIds = Array.from(new Set((allAccounts || []).map(a => a.csm_owner_id)))
    const csms = uniqueCsmIds.map(csm_owner_id => ({ csm_owner_id }))

    // Check if briefing already exists for today
    const { data: existing } = await supabase
      .from('daily_briefings')
      .select('csm_id')
      .eq('date', today)

    const existingCsmIds = new Set((existing || []).map(b => b.csm_id))

    // Process each CSM
    await Promise.allSettled(
      ((csms || []) as any[]).map(async (row) => {
        const csm_id = row.csm_owner_id

        // Skip if already generated today
        if (existingCsmIds.has(csm_id)) return

        try {
          // Fetch CSM's priorities + accounts + alerts for context
          const { data: priorities } = await supabase
            .from('daily_home_priorities')
            .select('*, accounts(name)')
            .eq('csm_id', csm_id)
            .eq('created_at', `[${today}T00:00:00, ${today}T23:59:59]`)
            .limit(10)

          const { data: critical_alerts } = await supabase
            .from('proactive_alerts')
            .select('type, accounts(name)')
            .eq('csm_id', csm_id)
            .is('resolved_at', null)
            .eq('severity', 'critical')
            .limit(5)

          const prompt = `
You are a CS operations assistant. Generate a daily briefing for a CSM with 3 top priorities.

Context:
- Priorities: ${JSON.stringify(priorities || [])}
- Critical Alerts: ${JSON.stringify(critical_alerts || [])}

Generate a JSON response with this exact structure (no markdown, raw JSON):
{
  "priority_1": {
    "title": "string",
    "account_name": "string",
    "action": "string",
    "urgency": "critical" | "high" | "medium"
  },
  "priority_2": { same structure },
  "priority_3": { same structure }
}

Each priority should be specific, actionable, and based on the context provided.
          `.trim()

          const model = gemini.getGenerativeModel({ model: 'gemini-pro' })
          const result = await model.generateContent(prompt)
          const responseText = result.response.text()

          // Extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error('No JSON found in response')

          const briefing = JSON.parse(jsonMatch[0])

          // Insert briefing
          await supabase
            .from('daily_briefings')
            .insert({
              csm_id,
              date: today,
              priorities: briefing
            })

          processed.push(csm_id)
        } catch (err: any) {
          console.error(`Error generating briefing for ${csm_id}:`, err)
          errors.push({ csm_id, error: err.message })
        }
      })
    )

    return NextResponse.json({
      success: true,
      ran_at: now.toISOString(),
      briefings_generated: processed.length,
      total_csms: (csms || []).length,
      errors_count: errors.length
    })
  } catch (err: any) {
    console.error('Daily briefing cron error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        processed_count: processed.length
      },
      { status: 500 }
    )
  }
}
