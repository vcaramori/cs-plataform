import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const NegotiationHistorySchema = z.object({
  negotiation_date: z.string(),
  outcome: z.enum(['agreed', 'declined', 'pending']),
  discount_offered_pct: z.number().min(0).max(100),
  discount_accepted_pct: z.number().min(0).max(100),
  main_objection: z.string().min(1),
  closing_argument: z.string(),
  counterpart_name: z.string().min(1),
  counterpart_role: z.string(),
  notes: z.string().optional(),
})

type NegotiationHistory = z.infer<typeof NegotiationHistorySchema>

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get negotiation history for contract
    const { data: negotiations, error } = await supabase
      .from('negotiation_history')
      .select('*')
      .eq('contract_id', contractId)
      .order('negotiation_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate trend
    let trend = null
    if (negotiations && negotiations.length >= 2) {
      const recent = negotiations[0].discount_accepted_pct
      const previous = negotiations[1].discount_accepted_pct
      if (recent < previous) {
        trend = 'declining'
      } else if (recent > previous) {
        trend = 'improving'
      } else {
        trend = 'stable'
      }
    }

    return NextResponse.json({
      negotiations: negotiations || [],
      trend,
    })
  } catch (error) {
    console.error('[negotiation-history] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const parsed = NegotiationHistorySchema.safeParse(body)
    if (!parsed.success) {
      console.error('[negotiation-history] Validation Error:', parsed.error.format())
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Validate discount logic
    if (parsed.data.discount_offered_pct < parsed.data.discount_accepted_pct) {
      return NextResponse.json(
        { error: 'Discount accepted cannot exceed discount offered' },
        { status: 400 }
      )
    }

    // Validate date is not in future
    const negDate = new Date(parsed.data.negotiation_date)
    if (negDate > new Date()) {
      return NextResponse.json(
        { error: 'Negotiation date cannot be in the future' },
        { status: 400 }
      )
    }

    // Insert negotiation record
    const { data, error } = await supabase
      .from('negotiation_history')
      .insert({
        contract_id: contractId,
        ...parsed.data,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[negotiation-history] Insert Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[negotiation-history] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}