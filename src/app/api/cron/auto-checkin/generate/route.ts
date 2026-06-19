import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateText } from '@/lib/llm/gateway'
import { loadInstruction } from '@/lib/ai/load-instruction'
import { getAIContextRules } from '@/lib/ai/ai-context'

export const maxDuration = 300 // 5 minutes

// Fallback de thresholds de silêncio por segmento (sobrescrito por ai_context_rules)
const SILENCE_THRESHOLDS: Record<string, number> = {
  'Indústria': 14,
  'MRO': 14,
  'Varejo': 21,
  'Distribuidor': 30,
}

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient() as any
  const rules = await getAIContextRules()
  const silenceThresholds: Record<string, number> = { ...SILENCE_THRESHOLDS, ...(rules.silence_by_segment ?? {}) }
  let generated = 0
  let skipped = 0
  let errors: string[] = []

  try {
    // Contas elegíveis (accounts.contract_status NÃO existe — quebrava o cron com 500;
    // "ativo" mora em contracts.status. Mantém só o opt-out de check-in automático).
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, segment, csm_owner_id, health_score')
      .eq('opt_out_auto_checkin', false)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ generated: 0, skipped: 0 })
    }


    for (const account of accounts) {
      try {
        const thresholdDays = silenceThresholds[account.segment] ?? silenceThresholds.default ?? 30
        const silenceDateThreshold = new Date()
        silenceDateThreshold.setDate(silenceDateThreshold.getDate() - thresholdDays)

        // 1. Check for recent interactions
        const { data: recentInteraction } = await supabase
          .from('interactions')
          .select('created_at')
          .eq('account_id', account.id)
          .gte('created_at', silenceDateThreshold.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (recentInteraction) {
          skipped++
          continue // Has recent interaction
        }

        // 2. Check for open/in_progress tickets
        const { data: openTickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('account_id', account.id)
          .in('status', ['open', 'in_progress'])
          .limit(1)

        if (openTickets && openTickets.length > 0) {
          skipped++
          continue // Has open tickets
        }

        // 3. Check for scheduled interactions in next 7 days
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)

        const { data: scheduledInteractions } = await supabase
          .from('interactions')
          .select('id')
          .eq('account_id', account.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .lte('date', nextWeek.toISOString().split('T')[0])
          .limit(1)

        if (scheduledInteractions && scheduledInteractions.length > 0) {
          skipped++
          continue // Has scheduled interaction
        }

        // 4. Check if already in queue for today
        const { data: existingQueue } = await supabase
          .from('auto_checkin_queue')
          .select('id')
          .eq('account_id', account.id)
          .gte('created_at', new Date().toISOString().split('T')[0])
          .limit(1)

        if (existingQueue && existingQueue.length > 0) {
          skipped++
          continue // Already queued today
        }

        // 5. Fetch last 5 interactions + health + NPS for context
        const { data: interactions } = await supabase
          .from('interactions')
          .select('type, title, date')
          .eq('account_id', account.id)
          .order('date', { ascending: false })
          .limit(5)

        const { data: npsResponses } = await supabase
          .from('nps_responses')
          .select('score, comment')
          .eq('account_id', account.id)
          .order('responded_at', { ascending: false })
          .limit(3)

        // 6. Generate personalized email with Gemini
        const baseInstruction = await loadInstruction(
          'instruction_auto_checkin',
          'Você é um gerente de sucesso do cliente em uma plataforma SaaS. Gere um email de check-in profissional e personalizado. Tom: consultivo, não vendedor. Retorne APENAS JSON com: subject, body.'
        )
        const prompt = `${baseInstruction}

Contexto:
- Nome da conta: ${account.name}
- Dias sem interação: ${thresholdDays}
- Health Score: ${account.health_score || 'não calculado'}
- Últimas interações: ${interactions?.map((i: any) => i.title).join(', ') || 'nenhuma'}
- NPS recente: ${npsResponses?.[0]?.score || 'não respondido'}

Instruções:
1. Gere um assunto CURTO (máx 60 caracteres)
2. Gere um corpo PROFISSIONAL (máx 200 palavras)
3. Tom: consultivo, não vendedor
4. Mencione o período de silêncio e sugira uma breve call de alinhamento
5. Não use placeholders - personalize de verdade

Retorne EXATAMENTE neste formato JSON:
{
  "subject": "assunto aqui",
  "body": "corpo aqui"
}`

        const result = await generateText(prompt, {
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
          disableThinking: true,
        })
        const responseText = result.result

        // Parse JSON response
        const match = responseText.match(/\{[\s\S]*\}/)
        if (!match) {
          errors.push(`Account ${account.id}: Failed to parse Gemini response`)
          continue
        }

        const emailContent = JSON.parse(match[0])

        // 7. Insert into queue with 4-hour approval deadline
        const approvalDeadline = new Date()
        approvalDeadline.setHours(approvalDeadline.getHours() + 4)

        const { error: queueError } = await supabase
          .from('auto_checkin_queue')
          .insert({
            account_id: account.id,
            csm_id: account.csm_owner_id,
            generated_subject: emailContent.subject,
            generated_body: emailContent.body,
            approval_deadline: approvalDeadline.toISOString(),
            status: 'pending'
          })

        if (queueError) {
          errors.push(`Account ${account.id}: ${queueError.message}`)
          continue
        }

        generated++
      } catch (err: any) {
        errors.push(`Account ${account.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      generated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: accounts.length
    })
  } catch (err: any) {
    console.error('[Auto-Checkin Generate] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
