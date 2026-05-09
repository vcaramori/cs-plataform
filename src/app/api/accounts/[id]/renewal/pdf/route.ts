import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateText } from "@/lib/llm/gateway"
import { z } from "zod"

export const maxDuration = 120

const RenewalBriefSchema = z.object({
  html: z.string(),
  filename: z.string(),
})

type RenewalBrief = z.infer<typeof RenewalBriefSchema>

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await context.params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account details
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, csm_owner_id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get health data
    const { data: healthScores } = await supabase
      .from('health_scores')
      .select('health_score_v2, calculated_at')
      .eq('account_id', accountId)
      .order('calculated_at', { ascending: false })
      .limit(12)

    // Get NPS data
    const { data: npsResponses } = await supabase
      .from('nps_responses')
      .select('score, feedback, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(4)

    // Get tickets summary
    const { data: tickets } = await supabase
      .from('tickets')
      .select('status')
      .eq('account_id', accountId)

    const ticketsOpen = tickets?.filter(t => t.status !== 'resolved').length || 0
    const ticketsTotal = tickets?.length || 0

    // Get contract info
    const { data: contracts } = await supabase
      .from('contracts')
      .select('arr, renewal_date, service_type')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single()

    // Get negotiation history
    const { data: negotiationHistory } = await supabase
      .from('negotiation_history')
      .select('discount_accepted_pct, outcome, negotiation_date')
      .eq('account_id', accountId)
      .order('negotiation_date', { ascending: false })
      .limit(3)

    // Generate renewal brief with Gemini
    const prompt = `Generate a 1-page executive renewal brief for a customer account.

Account Name: ${account.name}
ARR: $${contracts?.arr || 0}
Renewal Date: ${contracts?.renewal_date ? new Date(contracts.renewal_date).toLocaleDateString() : 'TBD'}

Health Score Trend (last 12 months): ${healthScores?.map(h => h.health_score_v2).join(', ') || 'N/A'}
NPS Scores (last 4): ${npsResponses?.map(r => r.score).join(', ') || 'N/A'}
Support Tickets: ${ticketsTotal} total, ${ticketsOpen} open
Recent Negotiation Discounts: ${negotiationHistory?.map(n => `${n.discount_accepted_pct}%`).join(', ') || 'None'}

Generate ONLY HTML (no markdown, no code blocks):
<html><head><title>Renewal Brief - ${account.name}</title><style>body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; } h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; } h2 { color: #374151; margin-top: 20px; } .metric { margin: 10px 0; } .positive { color: #10b981; } .negative { color: #ef4444; } .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }</style></head><body>
<h1>Renewal Brief: ${account.name}</h1>
<p><strong>Prepared:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Executive Summary</h2>
<p>This brief outlines the renewal opportunity for ${account.name}, highlighting key success metrics and recommended next steps.</p>

<h2>Account Health</h2>
<div class="metric">Health Trend: ${healthScores && healthScores[0].health_score_v2 > 60 ? '<span class="positive">Strong</span>' : '<span class="negative">Needs Attention</span>'}</div>
<div class="metric">Average Health Score: ${healthScores ? Math.round(healthScores.reduce((s, h) => s + h.health_score_v2, 0) / healthScores.length) : 0}/100</div>

<h2>Customer Satisfaction</h2>
<div class="metric">Average NPS: ${npsResponses && npsResponses.length > 0 ? Math.round(npsResponses.reduce((s, r) => s + (r.score || 0), 0) / npsResponses.length) : 0}/10</div>
<div class="metric">Support Issues: ${ticketsTotal} total, ${ticketsOpen} open</div>

<h2>Renewal Details</h2>
<div class="metric">ARR: $${contracts?.arr || 0}</div>
<div class="metric">Next Renewal: ${contracts?.renewal_date ? new Date(contracts.renewal_date).toLocaleDateString() : 'TBD'}</div>

<h2>Recommended Actions</h2>
<ul>
<li>Schedule executive business review to discuss success metrics</li>
<li>Review negotiation history and customer objections</li>
<li>Prepare value proposition aligned with customer goals</li>
</ul>

<div class="footer">
<p>This document was automatically generated. For questions, contact your CSM.</p>
</div>
</body></html>`

    let htmlContent: string
    try {
      const { result: generatedHtml } = await generateText(prompt, {
        temperature: 0.1,
        maxOutputTokens: 1500,
        disableThinking: true,
      })

      // Extract HTML from response
      const htmlMatch = generatedHtml.match(/<html[\s\S]*<\/html>/i)
      htmlContent = htmlMatch ? htmlMatch[0] : generatedHtml
    } catch (error) {
      console.error('[renewal/pdf] Gemini error, using fallback:', error)
      // Use fallback template
      htmlContent = `<html><head><title>Renewal Brief - ${account.name}</title></head><body>
<h1>Renewal Brief: ${account.name}</h1>
<p>Prepared: ${new Date().toLocaleDateString()}</p>
<h2>Account Summary</h2>
<p>ARR: $${contracts?.arr || 0}</p>
<p>Health Score: ${healthScores?.[0]?.health_score_v2 || 0}/100</p>
<p>Average NPS: ${npsResponses && npsResponses.length > 0 ? Math.round(npsResponses.reduce((s, r) => s + (r.score || 0), 0) / npsResponses.length) : 0}/10</p>
<h2>Recommended Actions</h2>
<ul>
<li>Schedule executive review</li>
<li>Discuss renewal terms and value</li>
</ul>
</body></html>`
    }

    // Register PDF record
    try {
      await supabase
        .from('renewal_documents')
        .insert({
          account_id: accountId,
          csm_id: user.id,
          generated_at: new Date().toISOString(),
          pdf_url: null, // Will be set by client after download
        })
    } catch (error) {
      console.error('[renewal/pdf] Failed to register document:', error)
    }

    const result: RenewalBrief = {
      html: htmlContent,
      filename: `renewal-${account.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[renewal/pdf] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}