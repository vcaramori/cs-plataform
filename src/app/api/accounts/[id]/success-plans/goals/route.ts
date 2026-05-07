import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  target_date: z.string().optional()
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateGoalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // RLS check
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('csm_owner_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get or create plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plan: any = await supabase
    .from('success_plans')
    .select('id')
    .eq('account_id', id)
    .is('deleted_at', null)
    .single()

  if (!plan.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newPlan: any = await supabase
      .from('success_plans')
      .insert({
        account_id: id,
        title: `Plano de Sucesso - ${new Date().getFullYear()}`,
        created_by: user.id
      })
      .select()
      .single()

    plan = newPlan
  } else {
    plan = plan.data
  }

  // Create goal
  const { data: goal, error } = await supabase
    .from('success_plan_goals')
    .insert({
      plan_id: plan.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      target_date: parsed.data.target_date || null,
      status: 'pending'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(goal, { status: 201 })
}
