import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateGoalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['pending', 'ongoing', 'completed', 'delayed']).optional()
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateGoalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // RLS check: goal must belong to a plan of an account the CSM owns
  const { data: goal } = await supabase
    .from('success_plan_goals')
    .select('plan_id')
    .eq('id', goalId)
    .single()

  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  const { data: plan } = await supabase
    .from('success_plans')
    .select('account_id')
    .eq('id', goal.plan_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', plan.account_id)
    .eq('csm_owner_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Build update payload
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  if (parsed.data.title) updateData.title = parsed.data.title
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.target_date !== undefined) updateData.target_date = parsed.data.target_date
  if (parsed.data.status) {
    updateData.status = parsed.data.status
    if (parsed.data.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('success_plan_goals')
    .update(updateData)
    .eq('id', goalId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS check
  const { data: goal } = await supabase
    .from('success_plan_goals')
    .select('plan_id')
    .eq('id', goalId)
    .single()

  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  const { data: plan } = await supabase
    .from('success_plans')
    .select('account_id')
    .eq('id', goal.plan_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', plan.account_id)
    .eq('csm_owner_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Soft delete
  const { error } = await supabase
    .from('success_plan_goals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', goalId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
