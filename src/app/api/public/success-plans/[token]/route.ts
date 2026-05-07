import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // No auth required for public endpoint
  const supabase = await getSupabaseServerClient()

  // Fetch plan by token
  const { data: plan, error: planError } = await supabase
    .from('success_plans')
    .select('*')
    .eq('shared_token', token)
    .is('deleted_at', null)
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Fetch goals for this plan
  const { data: goals } = await supabase
    .from('success_plan_goals')
    .select('*')
    .eq('plan_id', plan.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    plan,
    goals: goals || []
  })
}
