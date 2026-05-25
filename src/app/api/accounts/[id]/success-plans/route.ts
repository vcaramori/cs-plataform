import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isPrivileged = ['admin', 'super_admin', 'head_cs', 'csm_senior'].includes(profile?.role ?? '')

  const accountQuery = supabase.from('accounts').select('id').eq('id', id)
  if (!isPrivileged) accountQuery.eq('csm_owner_id', user.id)
  const { data: account } = await accountQuery.single()

  if (!account) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch plan + goals
  const { data: plan } = await supabase
    .from('success_plans')
    .select('*')
    .eq('account_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!plan) {
    return NextResponse.json({
      plan: null,
      goals: []
    })
  }

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
