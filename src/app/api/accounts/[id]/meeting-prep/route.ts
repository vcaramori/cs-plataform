import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/llm/gateway'
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
      .eq('auth_id', user.id)
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
      .select('description, interaction_date, activity_type')
      .eq('account_id', accountId)
      .order('interaction_date', { ascending: false })
      .limit(3)

    // Get latest 3 tickets
    const { data: tickets } = await supabase
      .from('tickets')
      .select('title, status, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Get latest NPS response
    const { data: npsResponses } = await supabase
      .from('nps_responses')
      .select('score, feedback, created_at')
      .eq('account_id', accountId)
      .not('feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    // Get scheduled meetings (future meetings)
    const today = new Date()
    const { data: scheduledMeetings } = await supabase
      .from('meetings')
      .select('meeting_date, title, agenda')
      .eq('account_id', accountId)
      .gte('meeting_date', today.toISOString())
      .order('meeting_date', { ascending: true })
      .limit(1)

    const nextMeeting = scheduledMeetings?.[0]
    if (!nextMeeting) {
      return NextResponse.json(
        {
          last_meeting_notes: 'No upcoming meetings scheduled',
          next_meeting_date: null,
          suggested_topics: [],
          ai_talking_points: [],
        },
        { status: 200 }
      )
    }

    // Get previous meeting notes
    const { data: pastMeetings } = await supabase
      .from('meetings')
      .select('title, notes, meeting_date')
      .eq('account_id', accountId)
      .lt('meeting_date', today.toISOString())
      .order('meeting_date', { ascending: false })
      .limit(1)

    const lastMeetingNotes = pastMeetings?.[0]?.notes || 'No previous meeting notes'

    // Generate talking points with Gemini
    const context = `
Account: ${account.name}
Last Meeting: ${lastMeetingNotes}
Recent Interactions: ${interactions?.map(i => i.description).join('; ') || 'None'}
Recent Tickets: ${tickets?.map(t => t.title).join('; ') || 'None'}
Latest NPS: ${npsResponses?.[0]?.score || 'N/A'} - ${npsResponses?.[0]?.feedback || ''}
    `.trim()

    const prompt = `Generate 3-5 talking points for a meeting with a customer account.

Context:
${context}

Generate ONLY a JSON array of talking points, no markdown:
["point 1", "point 2", "point 3"]

Each point should be 1-2 sentences, specific to the account context, and actionable.`

    const { result: talkingPointsText } = await generateText(prompt, {
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
      next_meeting_date: new Date(nextMeeting.meeting_date).toISOString().split('T')[0],
      suggested_topics: (typeof nextMeeting.agenda === 'string' ? nextMeeting.agenda : 'Account Review').split(';').filter(Boolean),
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
