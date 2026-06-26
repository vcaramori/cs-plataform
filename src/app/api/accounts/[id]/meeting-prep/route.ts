import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { z } from 'zod'

const MeetingPrepSchema = z.object({
  last_meeting_notes: z.string(),
  next_meeting_date: z.string(),
  suggested_topics: z.array(z.string()),
  ai_talking_points: z.array(z.string()),
})

type MeetingPrep = z.infer<typeof MeetingPrepSchema>

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
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

    // Check RLS: user must be CSM or csm_senior or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const isCsmOwner = profile?.id === account.csm_owner_id
    const isAdmin = profile?.role === 'admin'
    const isCsmSenior = profile?.role === 'csm_senior'

    if (!isCsmOwner && !isAdmin && !isCsmSenior) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get last 3 interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('title, raw_transcript, date, type')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(3)

    // Get latest 3 tickets
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('title, status, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Get latest NPS response
    const { data: npsResponses } = await supabase
      .from('nps_responses')
      .select('score, comment, created_at')
      .eq('account_id', accountId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    // Use last interaction as meeting context (meetings table not available)
    const today = new Date()
    const lastMeetingNotes = interactions?.[0]?.title || 'No recent interactions recorded'

    // Generate talking points with Gemini
    const context = `
Account: ${account.name}
Last Interaction: ${lastMeetingNotes}
Recent Interactions: ${interactions?.map(i => i.title).join('; ') || 'None'}
Recent Tickets: ${tickets?.map(t => t.title).join('; ') || 'None'}
Latest NPS: ${npsResponses?.[0]?.score || 'N/A'} - ${npsResponses?.[0]?.comment || ''}
    `.trim()

    const prompt = `Gere de 3 a 5 talking points para uma reunião de Customer Success com a conta abaixo.

Contexto:
${context}

Retorne APENAS o array JSON de talking points, sem markdown, sem objeto, sem texto fora do array. Cada ponto: 1-2 frases, específico ao contexto e acionável. Forma exata: ["ponto 1", "ponto 2", "ponto 3"]`

    const { result: talkingPointsText } = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('meeting_prep'),
      temperature: 0.1,
      maxOutputTokens: 500,
    })

    // Parse talking points
    let aiTalkingPoints: string[] = []
    try {
      const jsonMatch = talkingPointsText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        aiTalkingPoints = JSON.parse(jsonMatch[0])
      }
    } catch {
      aiTalkingPoints = [
        'Review account health and key metrics',
        'Discuss expansion opportunities',
        'Address any open concerns or blockers',
      ]
    }

    const meetingPrep: MeetingPrep = {
      last_meeting_notes: lastMeetingNotes,
      next_meeting_date: today.toISOString().split('T')[0],
      suggested_topics: ['Account Review', 'Health Check', 'Next Steps'],
      ai_talking_points: aiTalkingPoints.slice(0, 5),
    }

    return NextResponse.json(meetingPrep)
  } catch (error) {
    console.error('[meeting-prep] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
